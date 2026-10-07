import { DEMO_SESSION_HEADER, resolveDemoOwner, resolveOwner } from './identity';

describe('identificação da sessão de demonstração', () => {
  test('CT-SEG-01: o cabeçalho tem o nome esperado', () => {
    expect(DEMO_SESSION_HEADER).toBe('x-demo-session');
  });

  test.each(['3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f', 'a'.repeat(16), 'a'.repeat(64)])(
    'CT-SEG-02: aceita %s',
    (value) => {
      expect(resolveDemoOwner(value)).toBe(value);
    },
  );

  test.each([
    undefined,
    null,
    '',
    'curto',
    'a'.repeat(65),
    'MAIUSCULAS-NAO-VALEM-0001',
    '../../etc/passwd-0000',
    "x'; DROP TABLE users;--",
  ])('CT-SEG-03: recusa %p', (value) => {
    expect(resolveDemoOwner(value)).toBeUndefined();
  });
});

describe('descoberta do dono da requisição (ADR-014)', () => {
  const TOKEN = 'a'.repeat(30);
  const authenticate = (token: string) => (token === TOKEN ? 'conta-1' : undefined);
  const DEMO = '3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';

  test('CT-SEG-10: token Bearer válido identifica a conta', () => {
    expect(
      resolveOwner({ authorization: `Bearer ${TOKEN}` }, { authenticate, demoEnabled: false }),
    ).toBe('conta-1');
  });

  test.each([
    `Bearer ${'b'.repeat(30)}`,
    'Bearer curto',
    `bearer ${TOKEN}`,
    `Basic ${TOKEN}`,
    `Bearer ${TOKEN} extra`,
    TOKEN,
  ])('CT-SEG-11: Authorization %p não identifica ninguém', (authorization) => {
    expect(resolveOwner({ authorization }, { authenticate, demoEnabled: true })).toBeUndefined();
  });

  test('CT-SEG-12: token inválido não cai para a sessão de demonstração', () => {
    expect(
      resolveOwner(
        { authorization: `Bearer ${'b'.repeat(30)}`, demoSession: DEMO },
        { authenticate, demoEnabled: true },
      ),
    ).toBeUndefined();
  });

  test('CT-SEG-13: sem Authorization, a demonstração vale só se estiver habilitada', () => {
    expect(resolveOwner({ demoSession: DEMO }, { authenticate, demoEnabled: true })).toBe(DEMO);
    expect(
      resolveOwner({ demoSession: DEMO }, { authenticate, demoEnabled: false }),
    ).toBeUndefined();
    expect(resolveOwner({}, { authenticate, demoEnabled: true })).toBeUndefined();
  });
});
