import { createInMemoryAuthRepository } from '../repositories/in-memory-auth';
import { createBrevoEmailClient, unavailableEmailClient } from '../clients/brevo-email-client';
import { createAuthService, type AuthService } from './auth-service';
import type { EmailClient, EmailMessage } from './email-ports';
import { EmailSendError } from './email-ports';
import { createScryptHasher } from './password-hasher';
import { buildPasswordResetEmail } from './password-reset-email';
import { createFixedWindowLimiter } from './rate-limiter';
import { createTokenService } from './token-service';

const SECRET = 'uma-chave-de-teste-com-mais-de-32-caracteres';
const ORIGIN = { ip: '203.0.113.7' };
const PASSWORD = 'uma frase longa é melhor';
const NEW_PASSWORD = 'outra frase longa e boa';
const EMAIL = 'mariana@exemplo.com.br';
const WEB = 'https://app.exemplo.com.br';

function build(options: { email?: EmailClient; failSend?: boolean; webBaseUrl?: string } = {}) {
  let now = '2026-10-07T12:00:00.000Z';
  const clock = () => now;
  const sent: EmailMessage[] = [];
  const errors: string[] = [];
  const email: EmailClient = options.email ?? {
    async send(message) {
      if (options.failSend) throw new EmailSendError();
      sent.push(message);
    },
  };
  let counter = 0;
  const accounts = createInMemoryAuthRepository();
  const service: AuthService = createAuthService({
    accounts,
    hasher: createScryptHasher({ N: 16, r: 8, p: 1 }),
    tokens: createTokenService({ secret: SECRET, clock }),
    clock,
    newId: () => `conta-${(counter += 1)}`,
    limiter: createFixedWindowLimiter(clock),
    email,
    webBaseUrl: options.webBaseUrl ?? WEB,
    reportError: (kind) => errors.push(kind),
  });
  return {
    service,
    accounts,
    sent,
    errors,
    advance: (seconds: number) => {
      now = new Date(Date.parse(now) + seconds * 1000).toISOString();
    },
  };
}

async function withAccount(options: Parameters<typeof build>[0] = {}) {
  const ctx = build(options);
  const result = await ctx.service.register({ email: EMAIL, password: PASSWORD }, ORIGIN);
  if (!result.ok) throw new Error('cadastro de teste falhou');
  return { ...ctx, session: result.value };
}

function tokenFrom(message: EmailMessage | undefined): string {
  const match = /#token=([A-Za-z0-9_-]+)/.exec(message?.text ?? '');
  if (!match?.[1]) throw new Error('token não encontrado no e-mail');
  return match[1];
}

describe('e-mail de redefinição', () => {
  test('CT-RST-01: o token vai no fragmento do link, não na consulta, e o e-mail não traz dado pessoal', () => {
    const message = buildPasswordResetEmail(EMAIL, `${WEB}/`, 'tok_ABC-123');
    expect(message.to).toBe(EMAIL);
    expect(message.text).toContain(`${WEB}/redefinir-senha#token=tok_ABC-123`);
    expect(message.html).toContain(`href="${WEB}/redefinir-senha#token=tok_ABC-123"`);
    expect(message.text).not.toContain('?token');
    expect(message.text + message.html).not.toContain(EMAIL);
    expect(message.text).toContain('ignore este e-mail');
    expect(message.subject).toBe('Criar nova senha no Vacina em Dia');
  });
});

describe('cliente do Brevo', () => {
  const config = {
    apiKey: 'chave-secreta',
    senderEmail: 'nao-responda@exemplo.com.br',
    senderName: 'Vacina em Dia',
  };
  const message: EmailMessage = {
    to: EMAIL,
    subject: 'Assunto',
    text: 'texto',
    html: '<p>html</p>',
  };

  test('CT-RST-02: envia ao endpoint do Brevo com a chave no cabeçalho e o corpo certo', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ status: 201 });
    await createBrevoEmailClient({ ...config, fetchFn }).send(message);
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['api-key']).toBe('chave-secreta');
    expect(JSON.parse(init.body as string)).toEqual({
      sender: { email: 'nao-responda@exemplo.com.br', name: 'Vacina em Dia' },
      to: [{ email: EMAIL }],
      subject: 'Assunto',
      textContent: 'texto',
      htmlContent: '<p>html</p>',
    });
  });

  test('CT-RST-03: 202 (agendado) também é sucesso', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ status: 202 });
    await expect(
      createBrevoEmailClient({ ...config, fetchFn }).send(message),
    ).resolves.toBeUndefined();
  });

  test.each([400, 401, 403, 429, 500])(
    'CT-RST-04: resposta %i vira falha sem detalhe',
    async (status) => {
      const fetchFn = jest.fn().mockResolvedValue({ status });
      const promise = createBrevoEmailClient({ ...config, fetchFn }).send(message);
      await expect(promise).rejects.toBeInstanceOf(EmailSendError);
      await expect(promise).rejects.not.toThrow(EMAIL);
    },
  );

  test('CT-RST-05: falha de rede vira falha sem repetir a chave nem o destinatário', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error(`erro com ${EMAIL} e chave-secreta`));
    const promise = createBrevoEmailClient({ ...config, fetchFn }).send(message);
    await expect(promise).rejects.toBeInstanceOf(EmailSendError);
    await expect(promise).rejects.toMatchObject({ message: 'Não foi possível enviar o e-mail.' });
  });

  test('CT-RST-06: sem configuração, o cliente indisponível sempre falha', async () => {
    await expect(unavailableEmailClient.send(message)).rejects.toBeInstanceOf(EmailSendError);
  });
});

describe('pedido de recuperação de senha', () => {
  test('CT-RST-10: conta existente recebe o e-mail com o link; o token guardado é só o hash', async () => {
    const { service, sent, accounts } = await withAccount();
    const result = await service.requestPasswordReset(
      { email: ' MARIANA@exemplo.com.br ' },
      ORIGIN,
    );
    expect(result).toEqual({ ok: true, value: undefined });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe(EMAIL);
    const token = tokenFrom(sent[0]);
    const tokens = createTokenService({ secret: SECRET, clock: () => '2026-10-07T12:00:00.000Z' });
    const stored = await accounts.findPasswordResetToken(tokens.hashRefreshToken(token));
    expect(stored).toMatchObject({ accountId: 'conta-1', expiresAt: '2026-10-07T13:00:00.000Z' });
    expect(JSON.stringify(stored)).not.toContain(token);
  });

  test('CT-RST-11: conta inexistente tem a mesma resposta e nenhum e-mail sai', async () => {
    const { service, sent } = await withAccount();
    const missing = await service.requestPasswordReset({ email: 'ninguem@exemplo.com.br' }, ORIGIN);
    const existing = await service.requestPasswordReset({ email: EMAIL }, ORIGIN);
    expect(missing).toEqual(existing);
    expect(sent).toHaveLength(1);
  });

  test('CT-RST-12: falha do provedor é registrada só pelo tipo e a resposta continua igual', async () => {
    const { service, errors } = await withAccount({ failSend: true });
    const result = await service.requestPasswordReset({ email: EMAIL }, ORIGIN);
    expect(result).toEqual({ ok: true, value: undefined });
    expect(errors).toEqual(['PASSWORD_RESET_EMAIL_FAILED']);
    expect(JSON.stringify(errors)).not.toContain(EMAIL);
  });

  test('CT-RST-13: sem e-mail ou endereço do app configurados, nada é enviado e a resposta é a mesma', async () => {
    const { service, sent } = await withAccount({ webBaseUrl: '' });
    expect(await service.requestPasswordReset({ email: EMAIL }, ORIGIN)).toEqual({
      ok: true,
      value: undefined,
    });
    expect(sent).toHaveLength(0);
  });

  test('CT-RST-14: 3 pedidos por hora por e-mail; o 4º é limitado e a janela libera depois', async () => {
    const { service, advance } = await withAccount();
    const other = [
      { ip: '198.51.100.1' },
      { ip: '198.51.100.2' },
      { ip: '198.51.100.3' },
      { ip: '198.51.100.4' },
    ];
    for (const origin of other.slice(0, 3)) {
      expect((await service.requestPasswordReset({ email: EMAIL }, origin)).ok).toBe(true);
    }
    const blocked = await service.requestPasswordReset(
      { email: EMAIL },
      other[3] as { ip: string },
    );
    expect(blocked).toMatchObject({
      ok: false,
      error: { code: 'RATE_LIMITED', scope: 'reset', retryAfterSeconds: 3600 },
    });
    advance(3601);
    expect((await service.requestPasswordReset({ email: EMAIL }, ORIGIN)).ok).toBe(true);
  });

  test('CT-RST-15: 10 pedidos por hora por origem, mesmo para e-mails diferentes', async () => {
    const { service } = await withAccount();
    for (let i = 0; i < 10; i += 1) {
      await service.requestPasswordReset({ email: `alvo${i}@exemplo.com.br` }, ORIGIN);
    }
    const blocked = await service.requestPasswordReset({ email: 'alvo99@exemplo.com.br' }, ORIGIN);
    expect(blocked).toMatchObject({ ok: false, error: { code: 'RATE_LIMITED', scope: 'reset' } });
  });
});

describe('redefinição de senha', () => {
  async function requested() {
    const ctx = await withAccount();
    await ctx.service.requestPasswordReset({ email: EMAIL }, ORIGIN);
    return { ...ctx, token: tokenFrom(ctx.sent[0]) };
  }

  test('CT-RST-20: com o token, a senha nova vale, a antiga deixa de valer e as sessões caem', async () => {
    const { service, token, session } = await requested();
    expect(await service.resetPassword({ token, password: NEW_PASSWORD })).toEqual({
      ok: true,
      value: undefined,
    });
    expect((await service.login({ email: EMAIL, password: NEW_PASSWORD }, ORIGIN)).ok).toBe(true);
    expect(await service.login({ email: EMAIL, password: PASSWORD }, ORIGIN)).toEqual({
      ok: false,
      error: { code: 'INVALID_CREDENTIALS' },
    });
    expect((await service.refresh(session.refreshToken)).ok).toBe(false);
  });

  test('CT-RST-21: o token só vale uma vez', async () => {
    const { service, token } = await requested();
    await service.resetPassword({ token, password: NEW_PASSWORD });
    expect(await service.resetPassword({ token, password: 'mais uma frase longa' })).toEqual({
      ok: false,
      error: { code: 'INVALID_RESET_TOKEN' },
    });
  });

  test('CT-RST-22: o link vence em 1 hora, com limite exato', async () => {
    const { service, token, advance } = await requested();
    advance(3599);
    const early = await service.resetPassword({ token: 'x'.repeat(43), password: NEW_PASSWORD });
    expect(early).toEqual({ ok: false, error: { code: 'INVALID_RESET_TOKEN' } });
    advance(1);
    expect(await service.resetPassword({ token, password: NEW_PASSWORD })).toEqual({
      ok: false,
      error: { code: 'INVALID_RESET_TOKEN' },
    });
  });

  test('CT-RST-23: um minuto antes de vencer ainda funciona', async () => {
    const { service, token, advance } = await requested();
    advance(3540);
    expect((await service.resetPassword({ token, password: NEW_PASSWORD })).ok).toBe(true);
  });

  test('CT-RST-24: senha fraca é recusada sem gastar o token', async () => {
    const { service, token } = await requested();
    expect(await service.resetPassword({ token, password: '12345678' })).toEqual({
      ok: false,
      error: { code: 'WEAK_PASSWORD' },
    });
    expect((await service.resetPassword({ token, password: NEW_PASSWORD })).ok).toBe(true);
  });

  test('CT-RST-25: token desconhecido, ou de conta apagada, é recusado', async () => {
    const { service, token, accounts } = await requested();
    expect(
      (await service.resetPassword({ token: 'x'.repeat(43), password: NEW_PASSWORD })).ok,
    ).toBe(false);
    await accounts.deleteAccount('conta-1');
    expect(await service.resetPassword({ token, password: NEW_PASSWORD })).toEqual({
      ok: false,
      error: { code: 'INVALID_RESET_TOKEN' },
    });
  });

  test('CT-RST-26: dois usos ao mesmo tempo: só um passa', async () => {
    const { service, token } = await requested();
    const results = await Promise.all([
      service.resetPassword({ token, password: NEW_PASSWORD }),
      service.resetPassword({ token, password: NEW_PASSWORD }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  test('CT-RST-27: trocar a senha libera o bloqueio por tentativas do e-mail', async () => {
    const { service, token } = await requested();
    for (let i = 0; i < 5; i += 1) {
      await service.login({ email: EMAIL, password: 'errada-errada' }, ORIGIN);
    }
    await service.resetPassword({ token, password: NEW_PASSWORD });
    expect((await service.login({ email: EMAIL, password: NEW_PASSWORD }, ORIGIN)).ok).toBe(true);
  });
});
