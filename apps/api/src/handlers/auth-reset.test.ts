import { createInMemoryAuthRepository } from '../repositories/in-memory-auth';
import { createAuthService } from '../services/auth-service';
import type { EmailMessage } from '../services/email-ports';
import { createScryptHasher } from '../services/password-hasher';
import { createFixedWindowLimiter } from '../services/rate-limiter';
import { createTokenService } from '../services/token-service';
import { createAuthHandlers, unavailableAuthHandlers } from './auth';

const ORIGIN = { ip: '203.0.113.7' };
const PASSWORD = 'uma frase longa é melhor';

function build() {
  const clock = () => '2026-10-07T12:00:00.000Z';
  const sent: EmailMessage[] = [];
  let n = 0;
  const service = createAuthService({
    accounts: createInMemoryAuthRepository(),
    hasher: createScryptHasher({ N: 16, r: 8, p: 1 }),
    tokens: createTokenService({ secret: 'uma-chave-de-teste-com-mais-de-32-caracteres', clock }),
    clock,
    newId: () => `conta-${(n += 1)}`,
    limiter: createFixedWindowLimiter(clock),
    email: { send: async (message) => void sent.push(message) },
    webBaseUrl: 'https://app.exemplo.com.br',
  });
  return { handlers: createAuthHandlers(service), sent };
}

describe('handlers de recuperação de senha', () => {
  test('CT-RST-H01: pedir nova senha devolve 202 sem corpo, exista a conta ou não', async () => {
    const { handlers, sent } = build();
    await handlers.register(ORIGIN, { email: 'ana@exemplo.com.br', password: PASSWORD });
    const existing = await handlers.forgotPassword(ORIGIN, { email: 'ana@exemplo.com.br' });
    const missing = await handlers.forgotPassword(ORIGIN, { email: 'zzz@exemplo.com.br' });
    expect(existing).toEqual({ status: 202 });
    expect(missing).toEqual(existing);
    expect(sent).toHaveLength(1);
  });

  test.each([[undefined], [{}], [{ email: 'sem-arroba' }]])(
    'CT-RST-H02: pedido com corpo inválido %j dá 400',
    async (body) => {
      const result = await build().handlers.forgotPassword(ORIGIN, body);
      expect(result.status).toBe(400);
    },
  );

  test('CT-RST-H03: muitos pedidos dão 429 com Retry-After', async () => {
    const { handlers } = build();
    const body = { email: 'ana@exemplo.com.br' };
    for (let i = 0; i < 3; i += 1) await handlers.forgotPassword({ ip: `10.0.0.${i}` }, body);
    const result = await handlers.forgotPassword({ ip: '10.0.0.9' }, body);
    expect(result.status).toBe(429);
    expect(result.headers?.['retry-after']).toBe('3600');
    expect(JSON.stringify(result.jsonBody)).toContain('Muitos pedidos de nova senha');
  });

  test('CT-RST-H04: nova senha com o token do e-mail dá 204; token repetido dá 400', async () => {
    const { handlers, sent } = build();
    await handlers.register(ORIGIN, { email: 'ana@exemplo.com.br', password: PASSWORD });
    await handlers.forgotPassword(ORIGIN, { email: 'ana@exemplo.com.br' });
    const token = /#token=([A-Za-z0-9_-]+)/.exec(sent[0]?.text ?? '')?.[1] as string;
    expect(
      (await handlers.resetPassword({ token, password: 'outra frase longa e boa' })).status,
    ).toBe(204);
    const again = await handlers.resetPassword({ token, password: 'outra frase longa e boa' });
    expect(again.status).toBe(400);
    expect(again.jsonBody).toMatchObject({ code: 'INVALID_RESET_TOKEN' });
  });

  test('CT-RST-H05: senha fraca dá 422; corpo inválido dá 400', async () => {
    const { handlers, sent } = build();
    await handlers.register(ORIGIN, { email: 'ana@exemplo.com.br', password: PASSWORD });
    await handlers.forgotPassword(ORIGIN, { email: 'ana@exemplo.com.br' });
    const token = /#token=([A-Za-z0-9_-]+)/.exec(sent[0]?.text ?? '')?.[1] as string;
    expect((await handlers.resetPassword({ token, password: '12345678' })).status).toBe(422);
    expect((await handlers.resetPassword({ token, password: 'curta' })).status).toBe(400);
    expect((await handlers.resetPassword(undefined)).status).toBe(400);
  });

  test('CT-RST-H06: sem configuração, os dois dão 503', async () => {
    expect((await unavailableAuthHandlers.forgotPassword(ORIGIN, {})).status).toBe(503);
    expect((await unavailableAuthHandlers.resetPassword({})).status).toBe(503);
  });
});
