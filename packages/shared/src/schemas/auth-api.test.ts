import {
  authSessionSchema,
  loginInputSchema,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  refreshInputSchema,
  registerInputSchema,
} from './auth-api';

describe('esquemas de login', () => {
  test('CT-AUTH-S01: cadastro aceita e-mail válido e senha de 8 a 128 caracteres', () => {
    const ok = (password: string) =>
      registerInputSchema.safeParse({ email: 'ana@exemplo.com.br', password }).success;
    expect(ok('x'.repeat(PASSWORD_MIN_LENGTH))).toBe(true);
    expect(ok('x'.repeat(PASSWORD_MAX_LENGTH))).toBe(true);
    expect(ok('x'.repeat(PASSWORD_MIN_LENGTH - 1))).toBe(false);
    expect(ok('x'.repeat(PASSWORD_MAX_LENGTH + 1))).toBe(false);
  });

  test.each(['', 'ana', 'ana@', '@exemplo.com', 'ana@exemplo', `${'a'.repeat(250)}@b.com`])(
    'CT-AUTH-S02: recusa o e-mail %p',
    (email) => {
      expect(registerInputSchema.safeParse({ email, password: 'x'.repeat(8) }).success).toBe(false);
      expect(loginInputSchema.safeParse({ email, password: 'x' }).success).toBe(false);
    },
  );

  test('CT-AUTH-S03: login aceita senha de qualquer tamanho até o máximo, mas não vazia', () => {
    const parse = (password: string) =>
      loginInputSchema.safeParse({ email: 'ana@exemplo.com.br', password }).success;
    expect(parse('')).toBe(false);
    expect(parse('1')).toBe(true);
    expect(parse('x'.repeat(PASSWORD_MAX_LENGTH + 1))).toBe(false);
  });

  test('CT-AUTH-S04: o token de renovação tem de 20 a 200 caracteres', () => {
    expect(refreshInputSchema.safeParse({ refreshToken: 'x'.repeat(19) }).success).toBe(false);
    expect(refreshInputSchema.safeParse({ refreshToken: 'x'.repeat(43) }).success).toBe(true);
    expect(refreshInputSchema.safeParse({ refreshToken: 'x'.repeat(201) }).success).toBe(false);
  });

  test('CT-AUTH-S05: a sessão exige o tipo Bearer e validade positiva', () => {
    const base = {
      accessToken: 'a',
      refreshToken: 'r',
      tokenType: 'Bearer',
      expiresIn: 900,
      account: { id: '1', email: 'ana@exemplo.com.br' },
    };
    expect(authSessionSchema.safeParse(base).success).toBe(true);
    expect(authSessionSchema.safeParse({ ...base, tokenType: 'Basic' }).success).toBe(false);
    expect(authSessionSchema.safeParse({ ...base, expiresIn: 0 }).success).toBe(false);
  });
});
