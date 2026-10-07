import { createInMemoryAuthRepository } from '../repositories/in-memory-auth';
import { createAuthService } from '../services/auth-service';
import { createScryptHasher } from '../services/password-hasher';
import { createFixedWindowLimiter } from '../services/rate-limiter';
import { createTokenService } from '../services/token-service';
import { createAuthHandlers, unavailableAuthHandlers } from './auth';

const ORIGIN = { ip: '203.0.113.7' };
const PASSWORD = 'uma frase longa é melhor';

function build() {
  const clock = () => '2026-10-07T12:00:00.000Z';
  let n = 0;
  const service = createAuthService({
    accounts: createInMemoryAuthRepository(),
    hasher: createScryptHasher({ N: 16, r: 8, p: 1 }),
    tokens: createTokenService({ secret: 'uma-chave-de-teste-com-mais-de-32-caracteres', clock }),
    clock,
    newId: () => `conta-${(n += 1)}`,
    limiter: createFixedWindowLimiter(clock),
  });
  return createAuthHandlers(service);
}

describe('handlers de autenticação', () => {
  test('CT-AUTH-H01: cadastro devolve 201 com a sessão e sem cache; a senha não volta', async () => {
    const result = await build().register(ORIGIN, {
      email: 'ana@exemplo.com.br',
      password: PASSWORD,
    });
    expect(result.status).toBe(201);
    expect(result.headers).toEqual({ 'cache-control': 'no-store' });
    expect(JSON.stringify(result.jsonBody)).not.toContain(PASSWORD);
    expect(result.jsonBody).toMatchObject({
      tokenType: 'Bearer',
      account: { email: 'ana@exemplo.com.br' },
    });
  });

  test.each([
    [undefined],
    [{}],
    [{ email: 'nao-e-email', password: PASSWORD }],
    [{ email: 'ana@exemplo.com.br', password: 'curta' }],
    [{ email: 'ana@exemplo.com.br', password: 'x'.repeat(129) }],
  ])('CT-AUTH-H02: cadastro com corpo inválido %j dá 400 só com nomes de campos', async (body) => {
    const result = await build().register(ORIGIN, body);
    expect(result.status).toBe(400);
    expect(JSON.stringify(result.jsonBody)).not.toContain(PASSWORD);
    expect(result.jsonBody).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  test('CT-AUTH-H03: e-mail repetido dá 409; senha fraca dá 422', async () => {
    const handlers = build();
    const body = { email: 'ana@exemplo.com.br', password: PASSWORD };
    await handlers.register(ORIGIN, body);
    expect((await handlers.register(ORIGIN, body)).status).toBe(409);
    const weak = { email: 'b@exemplo.com.br', password: '12345678' };
    expect((await handlers.register(ORIGIN, weak)).status).toBe(422);
  });

  test('CT-AUTH-H04: login errado dá 401 sem dizer qual dado falhou', async () => {
    const handlers = build();
    await handlers.register(ORIGIN, { email: 'ana@exemplo.com.br', password: PASSWORD });
    const wrong = await handlers.login(ORIGIN, {
      email: 'ana@exemplo.com.br',
      password: 'errada-errada',
    });
    const missing = await handlers.login(ORIGIN, {
      email: 'zzz@exemplo.com.br',
      password: 'errada-errada',
    });
    expect(wrong.status).toBe(401);
    expect(wrong.jsonBody).toEqual(missing.jsonBody);
  });

  test('CT-AUTH-H05: bloqueio por tentativas dá 429 com Retry-After', async () => {
    const handlers = build();
    const attempt = { email: 'ana@exemplo.com.br', password: 'errada-errada' };
    for (let i = 0; i < 5; i += 1) await handlers.login(ORIGIN, attempt);
    const result = await handlers.login(ORIGIN, attempt);
    expect(result.status).toBe(429);
    expect(result.headers?.['retry-after']).toBe('900');
  });

  test('CT-AUTH-H06: renovar e sair; corpo inválido dá 400; token falso dá 401; saída dá 204', async () => {
    const handlers = build();
    const reg = await handlers.register(ORIGIN, {
      email: 'ana@exemplo.com.br',
      password: PASSWORD,
    });
    const { refreshToken } = reg.jsonBody as { refreshToken: string };
    expect((await handlers.refresh({ refreshToken })).status).toBe(200);
    expect((await handlers.refresh({ refreshToken })).status).toBe(401);
    expect((await handlers.refresh({})).status).toBe(400);
    expect((await handlers.logout({ refreshToken: 'x'.repeat(43) })).status).toBe(204);
    expect((await handlers.logout(undefined)).status).toBe(400);
    expect((await handlers.login(ORIGIN, undefined)).status).toBe(400);
  });

  test('CT-AUTH-H07: me devolve a conta, ou 401 se ela não existe mais', async () => {
    const handlers = build();
    await handlers.register(ORIGIN, { email: 'ana@exemplo.com.br', password: PASSWORD });
    expect(await handlers.me('conta-1')).toEqual({
      status: 200,
      jsonBody: { id: 'conta-1', email: 'ana@exemplo.com.br' },
    });
    expect((await handlers.me('outra')).status).toBe(401);
  });

  test('CT-AUTH-H08: sem configuração, cadastro, login e renovação dão 503; sair dá 204; me dá 401', async () => {
    expect((await unavailableAuthHandlers.register(ORIGIN, {})).status).toBe(503);
    expect((await unavailableAuthHandlers.login(ORIGIN, {})).status).toBe(503);
    expect((await unavailableAuthHandlers.refresh({})).status).toBe(503);
    expect((await unavailableAuthHandlers.logout({})).status).toBe(204);
    expect((await unavailableAuthHandlers.me('x')).status).toBe(401);
  });
});
