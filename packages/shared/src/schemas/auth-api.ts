import { z } from 'zod';

/** Tamanho mínimo da senha (NIST SP 800-63B; sem regras de composição). */
export const PASSWORD_MIN_LENGTH = 8;

/** Tamanho máximo da senha: limita o custo do cálculo do hash. */
export const PASSWORD_MAX_LENGTH = 128;

const emailField = z
  .email('Informe um e-mail válido.')
  .max(254)
  .meta({ example: 'mariana@exemplo.com.br', description: 'E-mail da conta.' });

/** Cadastro de uma conta (RF01, ADR-014). */
export const registerInputSchema = z
  .object({
    email: emailField,
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, 'A senha precisa de pelo menos 8 caracteres.')
      .max(PASSWORD_MAX_LENGTH)
      .meta({
        example: 'uma frase longa é melhor',
        description: 'Senha de 8 a 128 caracteres. Nunca é guardada: só o hash.',
      }),
  })
  .meta({ id: 'RegisterInput' });

/** Entrada na conta. */
export const loginInputSchema = z
  .object({
    email: emailField,
    password: z
      .string()
      .min(1)
      .max(PASSWORD_MAX_LENGTH)
      .meta({ example: 'uma frase longa é melhor' }),
  })
  .meta({ id: 'LoginInput' });

/** Pedido de recuperação de senha: o e-mail da conta. */
export const forgotPasswordInputSchema = z
  .object({ email: emailField })
  .meta({ id: 'ForgotPasswordInput' });

/** Nova senha, com o token recebido por e-mail. */
export const resetPasswordInputSchema = z
  .object({
    token: z.string().min(20).max(200).meta({ description: 'Token do link recebido por e-mail.' }),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, 'A senha precisa de pelo menos 8 caracteres.')
      .max(PASSWORD_MAX_LENGTH)
      .meta({
        example: 'outra frase longa e boa',
        description: 'Nova senha de 8 a 128 caracteres.',
      }),
  })
  .meta({ id: 'ResetPasswordInput' });

/** Renovação ou encerramento da sessão: o token de renovação recebido no login. */
export const refreshInputSchema = z
  .object({
    refreshToken: z.string().min(20).max(200).meta({ description: 'Token de renovação.' }),
  })
  .meta({ id: 'RefreshInput' });

/** Dados públicos da conta. */
export const accountInfoSchema = z
  .object({
    id: z.string().meta({ example: 'a3f1c2d4-0000-4000-8000-000000000001' }),
    email: z.string().meta({ example: 'mariana@exemplo.com.br' }),
  })
  .meta({ id: 'AccountInfo' });

/** Sessão devolvida no cadastro, no login e na renovação. */
export const authSessionSchema = z
  .object({
    accessToken: z
      .string()
      .meta({ description: 'JWT de curta duração, para o cabeçalho `Authorization: Bearer`.' }),
    refreshToken: z
      .string()
      .meta({ description: 'Token opaco para obter outra sessão. Cada uso gera um novo.' }),
    tokenType: z.literal('Bearer'),
    expiresIn: z
      .number()
      .int()
      .positive()
      .meta({ example: 900, description: 'Validade do token de acesso, em segundos.' }),
    account: accountInfoSchema,
  })
  .meta({ id: 'AuthSession' });

/** Pedido de recuperação de senha. */
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;
/** Redefinição de senha. */
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;
/** Cadastro. */
export type RegisterInput = z.infer<typeof registerInputSchema>;
/** Login. */
export type LoginInput = z.infer<typeof loginInputSchema>;
/** Renovação. */
export type RefreshInput = z.infer<typeof refreshInputSchema>;
/** Conta. */
export type AccountInfo = z.infer<typeof accountInfoSchema>;
/** Sessão. */
export type AuthSession = z.infer<typeof authSessionSchema>;
