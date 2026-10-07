import { createHmac } from 'node:crypto';
import { createInMemoryAuthRepository } from '../repositories/in-memory-auth';
import { createAuthService, normalizeEmail, type AuthService } from './auth-service';
import { createFailureThrottle, throttleKey } from './failure-throttle';
import { createScryptHasher } from './password-hasher';
import { isWeakPassword } from './password-policy';
import { createFixedWindowLimiter } from './rate-limiter';
import { createTokenService, type TokenService } from './token-service';

const SECRET = 'uma-chave-de-teste-com-mais-de-32-caracteres';
const ORIGIN = { ip: '203.0.113.7' };
const PASSWORD = 'uma frase longa é melhor';
const FAST = { N: 16, r: 8, p: 1 };

function build() {
  let now = '2026-10-07T12:00:00.000Z';
  const clock = () => now;
  let counter = 0;
  const accounts = createInMemoryAuthRepository();
  const tokens = createTokenService({ secret: SECRET, clock });
  const service = createAuthService({
    accounts,
    hasher: createScryptHasher(FAST),
    tokens,
    clock,
    newId: () => `conta-${(counter += 1)}`,
    limiter: createFixedWindowLimiter(clock),
  });
  return {
    accounts,
    tokens,
    service,
    advance: (seconds: number) => {
      now = new Date(Date.parse(now) + seconds * 1000).toISOString();
    },
  };
}

async function registered(service: AuthService, email = 'Mariana@Exemplo.com.br') {
  const result = await service.register({ email, password: PASSWORD }, ORIGIN);
  if (!result.ok) throw new Error('cadastro de teste falhou');
  return result.value;
}

describe('hash de senha (scrypt)', () => {
  const hasher = createScryptHasher(FAST);

  test('CT-AUTH-01: o hash não contém a senha, tem sal aleatório e confere', async () => {
    const [a, b] = [await hasher.hash(PASSWORD), await hasher.hash(PASSWORD)];
    expect(a).not.toContain(PASSWORD);
    expect(a).toMatch(/^scrypt\$16\$8\$1\$/);
    expect(a).not.toBe(b);
    await expect(hasher.verify(PASSWORD, a)).resolves.toBe(true);
    await expect(hasher.verify(`${PASSWORD}x`, a)).resolves.toBe(false);
  });

  test('CT-AUTH-02: a mesma frase em formas Unicode diferentes confere (NFKC)', async () => {
    const hash = await hasher.hash('ação ção');
    await expect(hasher.verify('ação ção'.normalize('NFD'), hash)).resolves.toBe(true);
  });

  test.each([
    '',
    'texto-qualquer',
    'bcrypt$1$2$3$4$5',
    'scrypt$0$8$1$c2Fs$aGFzaA',
    'scrypt$16$8$1$$aGFzaA',
    'scrypt$16$8$1$c2Fs$curto',
    'scrypt$x$8$1$c2Fs$aGFzaA',
  ])('CT-AUTH-03: hash malformado %p nunca confere', async (stored) => {
    await expect(hasher.verify(PASSWORD, stored)).resolves.toBe(false);
  });

  test('CT-AUTH-04: parâmetros impossíveis no hash guardado dão falso, sem lançar erro', async () => {
    const stored = `scrypt$3$8$1$${Buffer.from('salsalsalsalsals').toString('base64url')}$${Buffer.alloc(32).toString('base64url')}`;
    await expect(hasher.verify(PASSWORD, stored)).resolves.toBe(false);
  });
});

describe('política de senha', () => {
  test.each(['12345678', 'Senha123', 'PASSWORD', 'aaaaaaaa', 'mariana@exemplo.com.br', 'mariana'])(
    'CT-AUTH-05: recusa %p',
    (password) => {
      expect(isWeakPassword(password, 'mariana@exemplo.com.br')).toBe(true);
    },
  );

  test.each(['uma frase longa é melhor', 'cavalo-bateria-grampo', 'x9#Lp2!q'])(
    'CT-AUTH-06: aceita %p, sem regra de composição',
    (password) => {
      expect(isWeakPassword(password, 'mariana@exemplo.com.br')).toBe(false);
    },
  );
});

describe('tokens', () => {
  const clock = () => '2026-10-07T12:00:00.000Z';
  const make = (extra: Partial<Parameters<typeof createTokenService>[0]> = {}) =>
    createTokenService({ secret: SECRET, clock, ...extra });

  test('CT-AUTH-10: chave curta é recusada', () => {
    expect(() => createTokenService({ secret: 'curta', clock })).toThrow();
  });

  test('CT-AUTH-11: o JWT assinado confere e carrega só o id da conta', () => {
    const tokens = make();
    const { token, expiresIn } = tokens.signAccess('conta-1');
    expect(expiresIn).toBe(900);
    expect(tokens.verifyAccess(token)).toBe('conta-1');
    const payload = JSON.parse(Buffer.from(token.split('.')[1] as string, 'base64url').toString());
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'iss', 'sub']);
  });

  test('CT-AUTH-12: token vencido é recusado e o limite é exato', () => {
    let now = '2026-10-07T12:00:00.000Z';
    const tokens = createTokenService({ secret: SECRET, clock: () => now });
    const { token } = tokens.signAccess('conta-1');
    now = '2026-10-07T12:14:59.000Z';
    expect(tokens.verifyAccess(token)).toBe('conta-1');
    now = '2026-10-07T12:15:00.000Z';
    expect(tokens.verifyAccess(token)).toBeUndefined();
  });

  test('CT-AUTH-13: assinatura adulterada, outra chave e partes erradas são recusadas', () => {
    const tokens = make();
    const { token } = tokens.signAccess('conta-1');
    const [h, p, s] = token.split('.') as [string, string, string];
    const forged = Buffer.from(JSON.stringify({ iss: 'vacina-em-dia', sub: 'conta-2', exp: 9e9 }));
    expect(tokens.verifyAccess(`${h}.${forged.toString('base64url')}.${s}`)).toBeUndefined();
    expect(tokens.verifyAccess(`${h}.${p}.${s.slice(0, -2)}AA`)).toBeUndefined();
    expect(make({ secret: `${SECRET}-outra` }).verifyAccess(token)).toBeUndefined();
    expect(tokens.verifyAccess(`${h}.${p}`)).toBeUndefined();
    expect(tokens.verifyAccess('')).toBeUndefined();
  });

  test('CT-AUTH-14: algoritmo "none" e cabeçalho diferente são recusados', () => {
    const tokens = make();
    const none = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ iss: 'vacina-em-dia', sub: 'conta-1', exp: 9e9 }),
    ).toString('base64url');
    expect(tokens.verifyAccess(`${none}.${payload}.`)).toBeUndefined();
    expect(tokens.verifyAccess(`${none}.${payload}.assinatura`)).toBeUndefined();
  });

  test('CT-AUTH-15: emissor errado ou carga que não é objeto são recusados mesmo com assinatura válida', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const sign = (payload: string) =>
      `${header}.${payload}.${createHmac('sha256', SECRET).update(`${header}.${payload}`).digest('base64url')}`;
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const tokens = make();
    expect(tokens.verifyAccess(sign(encode({ iss: 'outro', sub: 'a', exp: 9e9 })))).toBeUndefined();
    expect(tokens.verifyAccess(sign(encode({ iss: 'vacina-em-dia', exp: 9e9 })))).toBeUndefined();
    expect(tokens.verifyAccess(sign(encode('texto')))).toBeUndefined();
    expect(tokens.verifyAccess(sign(encode(null)))).toBeUndefined();
    expect(
      tokens.verifyAccess(sign(Buffer.from('{quebrado').toString('base64url'))),
    ).toBeUndefined();
  });

  test('CT-AUTH-16: token de renovação tem 256 bits, é diferente a cada vez e só o hash é derivado', () => {
    const tokens: TokenService = make();
    const [a, b] = [tokens.newRefreshToken(), tokens.newRefreshToken()];
    expect(Buffer.from(a.token, 'base64url')).toHaveLength(32);
    expect(a.token).not.toBe(b.token);
    expect(a.hash).toBe(tokens.hashRefreshToken(a.token));
    expect(a.hash).not.toContain(a.token);
    expect(tokens.refreshTtlSeconds).toBe(30 * 24 * 60 * 60);
  });
});

describe('bloqueio por falhas', () => {
  test('CT-AUTH-20: bloqueia na quinta falha, informa quanto esperar e libera ao fim da janela', () => {
    let now = Date.parse('2026-10-07T12:00:00.000Z');
    const throttle = createFailureThrottle(() => new Date(now).toISOString(), 5, 900);
    for (let i = 0; i < 4; i += 1) throttle.fail('k');
    expect(throttle.check('k')).toEqual({ blocked: false });
    throttle.fail('k');
    now += 60_000;
    expect(throttle.check('k')).toEqual({ blocked: true, retryAfterSeconds: 840 });
    now += 840_000;
    expect(throttle.check('k')).toEqual({ blocked: false });
  });

  test('CT-AUTH-21: reset zera a chave e chaves são independentes', () => {
    const throttle = createFailureThrottle(() => '2026-10-07T12:00:00.000Z', 1, 900);
    throttle.fail('a');
    expect(throttle.check('a').blocked).toBe(true);
    expect(throttle.check('b').blocked).toBe(false);
    throttle.reset('a');
    expect(throttle.check('a').blocked).toBe(false);
  });

  test('CT-AUTH-22: a chave opaca não revela o valor', () => {
    expect(throttleKey('mariana@exemplo.com.br')).toMatch(/^[0-9a-f]{32}$/);
    expect(throttleKey('mariana@exemplo.com.br')).not.toContain('mariana');
  });

  test('CT-AUTH-23: com muitas chaves, as vencidas são descartadas na limpeza', () => {
    let now = Date.parse('2026-10-07T12:00:00.000Z');
    const throttle = createFailureThrottle(() => new Date(now).toISOString(), 5, 60);
    for (let i = 0; i < 5000; i += 1) throttle.fail(`k${i}`);
    now += 61_000;
    throttle.fail('nova');
    expect(throttle.check('k1')).toEqual({ blocked: false });
  });
});

describe('cadastro', () => {
  test('CT-AUTH-30: cria a conta com e-mail em minúsculas, abre a sessão e não guarda a senha', async () => {
    const { service, accounts, tokens } = build();
    const session = await registered(service);
    expect(session.account).toEqual({ id: 'conta-1', email: 'mariana@exemplo.com.br' });
    expect(session.tokenType).toBe('Bearer');
    expect(tokens.verifyAccess(session.accessToken)).toBe('conta-1');
    const stored = await accounts.findAccountByEmail('mariana@exemplo.com.br');
    expect(JSON.stringify(stored)).not.toContain(PASSWORD);
    expect(stored?.passwordHash.startsWith('scrypt$')).toBe(true);
  });

  test('CT-AUTH-31: e-mail repetido (mesmo com outra caixa) dá 409 de domínio', async () => {
    const { service } = build();
    await registered(service);
    const again = await service.register(
      { email: ' MARIANA@exemplo.com.br ', password: PASSWORD },
      ORIGIN,
    );
    expect(again).toEqual({ ok: false, error: { code: 'EMAIL_ALREADY_REGISTERED' } });
  });

  test('CT-AUTH-32: senha fraca é recusada antes de gravar', async () => {
    const { service, accounts } = build();
    const result = await service.register({ email: 'a@b.com', password: 'senha123' }, ORIGIN);
    expect(result).toEqual({ ok: false, error: { code: 'WEAK_PASSWORD' } });
    expect(accounts.size()).toBe(0);
  });

  test('CT-AUTH-33: 10 cadastros por hora por origem; o 11º é limitado e a janela libera depois', async () => {
    const { service, advance } = build();
    for (let i = 0; i < 10; i += 1) await registered(service, `pessoa${i}@exemplo.com.br`);
    const blocked = await service.register(
      { email: 'x@exemplo.com.br', password: PASSWORD },
      ORIGIN,
    );
    expect(blocked).toMatchObject({
      ok: false,
      error: { code: 'RATE_LIMITED', scope: 'register', retryAfterSeconds: 3600 },
    });
    advance(3601);
    const later = await service.register({ email: 'x@exemplo.com.br', password: PASSWORD }, ORIGIN);
    expect(later.ok).toBe(true);
  });

  test('CT-AUTH-34: no teto de contas o cadastro é recusado', async () => {
    const accounts = createInMemoryAuthRepository();
    const clock = () => '2026-10-07T12:00:00.000Z';
    const service = createAuthService({
      accounts,
      hasher: createScryptHasher(FAST),
      tokens: createTokenService({ secret: SECRET, clock }),
      clock,
      newId: () => 'id',
      limiter: createFixedWindowLimiter(clock),
      maxAccounts: 0,
      countAccounts: () => 0,
    });
    expect(await service.register({ email: 'a@b.com', password: PASSWORD }, ORIGIN)).toEqual({
      ok: false,
      error: { code: 'AUTH_UNAVAILABLE' },
    });
  });

  test('CT-AUTH-35: normalizeEmail tira espaços e baixa a caixa', () => {
    expect(normalizeEmail('  Ana@Exemplo.COM ')).toBe('ana@exemplo.com');
  });
});

describe('login', () => {
  test('CT-AUTH-40: e-mail e senha corretos abrem a sessão (e o e-mail aceita outra caixa)', async () => {
    const { service } = build();
    await registered(service);
    const result = await service.login(
      { email: 'MARIANA@exemplo.com.br', password: PASSWORD },
      ORIGIN,
    );
    expect(result.ok).toBe(true);
  });

  test('CT-AUTH-41: conta inexistente e senha errada têm exatamente a mesma resposta', async () => {
    const { service } = build();
    await registered(service);
    const wrong = await service.login(
      { email: 'mariana@exemplo.com.br', password: 'errada-errada' },
      ORIGIN,
    );
    const missing = await service.login(
      { email: 'ninguem@exemplo.com.br', password: PASSWORD },
      ORIGIN,
    );
    expect(wrong).toEqual({ ok: false, error: { code: 'INVALID_CREDENTIALS' } });
    expect(missing).toEqual(wrong);
  });

  test('CT-AUTH-42: 5 falhas bloqueiam o e-mail, até com a senha certa; passada a janela, volta a valer', async () => {
    const { service, advance } = build();
    await registered(service);
    for (let i = 0; i < 5; i += 1) {
      await service.login({ email: 'mariana@exemplo.com.br', password: 'errada-errada' }, ORIGIN);
    }
    const blocked = await service.login(
      { email: 'mariana@exemplo.com.br', password: PASSWORD },
      ORIGIN,
    );
    expect(blocked).toMatchObject({
      ok: false,
      error: { code: 'RATE_LIMITED', scope: 'login', retryAfterSeconds: 900 },
    });
    advance(901);
    const later = await service.login(
      { email: 'mariana@exemplo.com.br', password: PASSWORD },
      ORIGIN,
    );
    expect(later.ok).toBe(true);
  });

  test('CT-AUTH-43: o bloqueio de um e-mail não atinge outro e-mail', async () => {
    const { service } = build();
    await registered(service);
    await registered(service, 'jose@exemplo.com.br');
    for (let i = 0; i < 5; i += 1) {
      await service.login(
        { email: 'mariana@exemplo.com.br', password: 'errada-errada' },
        { ip: '198.51.100.1' },
      );
    }
    const other = await service.login(
      { email: 'jose@exemplo.com.br', password: PASSWORD },
      { ip: '198.51.100.2' },
    );
    expect(other.ok).toBe(true);
  });

  test('CT-AUTH-44: uma origem que erra em muitos e-mails também é bloqueada', async () => {
    const { service } = build();
    for (let i = 0; i < 20; i += 1) {
      await service.login({ email: `alvo${i}@exemplo.com.br`, password: 'errada-errada' }, ORIGIN);
    }
    const blocked = await service.login(
      { email: 'alvo99@exemplo.com.br', password: 'errada-errada' },
      ORIGIN,
    );
    expect(blocked).toMatchObject({ ok: false, error: { code: 'RATE_LIMITED', scope: 'login' } });
  });

  test('CT-AUTH-45: um login correto zera as falhas do e-mail', async () => {
    const { service } = build();
    await registered(service);
    for (let i = 0; i < 4; i += 1) {
      await service.login({ email: 'mariana@exemplo.com.br', password: 'errada-errada' }, ORIGIN);
    }
    await service.login({ email: 'mariana@exemplo.com.br', password: PASSWORD }, ORIGIN);
    const again = await service.login(
      { email: 'mariana@exemplo.com.br', password: 'errada-errada' },
      ORIGIN,
    );
    expect(again).toEqual({ ok: false, error: { code: 'INVALID_CREDENTIALS' } });
  });
});

describe('renovação e saída', () => {
  test('CT-AUTH-50: o token de renovação troca por uma sessão nova e o antigo deixa de valer', async () => {
    const { service } = build();
    const first = await registered(service);
    const second = await service.refresh(first.refreshToken);
    expect(second.ok && second.value.refreshToken).not.toBe(first.refreshToken);
    expect(await service.refresh(first.refreshToken)).toEqual({
      ok: false,
      error: { code: 'INVALID_TOKEN' },
    });
  });

  test('CT-AUTH-51: reusar um token já trocado revoga também o token novo (reuso suspeito)', async () => {
    const { service } = build();
    const first = await registered(service);
    const second = await service.refresh(first.refreshToken);
    await service.refresh(first.refreshToken);
    if (!second.ok) throw new Error('falhou');
    expect(await service.refresh(second.value.refreshToken)).toEqual({
      ok: false,
      error: { code: 'INVALID_TOKEN' },
    });
  });

  test('CT-AUTH-52: token desconhecido, vencido ou de conta apagada é recusado', async () => {
    const { service, advance, accounts } = build();
    expect(await service.refresh('x'.repeat(43))).toEqual({
      ok: false,
      error: { code: 'INVALID_TOKEN' },
    });
    const session = await registered(service);
    advance(30 * 24 * 60 * 60);
    expect(await service.refresh(session.refreshToken)).toEqual({
      ok: false,
      error: { code: 'INVALID_TOKEN' },
    });
    advance(-30 * 24 * 60 * 60);
    await accounts.deleteAccount('conta-1');
    expect(await service.refresh(session.refreshToken)).toEqual({
      ok: false,
      error: { code: 'INVALID_TOKEN' },
    });
  });

  test('CT-AUTH-53: sair revoga o token; sair duas vezes ou com token falso não falha', async () => {
    const { service } = build();
    const session = await registered(service);
    await service.logout(session.refreshToken);
    await expect(service.logout(session.refreshToken)).resolves.toBeUndefined();
    await expect(service.logout('x'.repeat(43))).resolves.toBeUndefined();
    expect((await service.refresh(session.refreshToken)).ok).toBe(false);
  });

  test('CT-AUTH-54: authenticate devolve o id da conta e describe devolve os dados públicos', async () => {
    const { service } = build();
    const session = await registered(service);
    expect(service.authenticate(session.accessToken)).toBe('conta-1');
    expect(service.authenticate('lixo')).toBeUndefined();
    expect(await service.describe('conta-1')).toEqual({
      id: 'conta-1',
      email: 'mariana@exemplo.com.br',
    });
    expect(await service.describe('inexistente')).toBeUndefined();
  });
});

describe('repositório de contas em memória', () => {
  test('CT-AUTH-60: excluir a conta apaga a conta e os tokens, e libera o e-mail', async () => {
    const { service, accounts } = build();
    const session = await registered(service);
    await accounts.deleteAccount('conta-1');
    await accounts.deleteAccount('conta-1');
    expect(await accounts.findAccountById('conta-1')).toBeUndefined();
    expect(accounts.size()).toBe(0);
    expect((await service.refresh(session.refreshToken)).ok).toBe(false);
    expect((await registered(service)).account.email).toBe('mariana@exemplo.com.br');
  });
});
