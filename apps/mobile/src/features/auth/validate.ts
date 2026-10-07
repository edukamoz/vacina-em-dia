import { loginInputSchema, PASSWORD_MIN_LENGTH, registerInputSchema } from '@vacina/shared';

/** Erros por campo de um formulário de entrada. */
export interface FieldErrors {
  readonly email?: string;
  readonly password?: string;
}

const EMAIL_MESSAGE = 'Informe um e-mail válido, por exemplo nome@exemplo.com.br.';

/**
 * Confere os campos antes de enviar, com mensagens em linguagem simples. A API valida de novo; isto
 * só poupa uma viagem e diz ao usuário o que corrigir.
 *
 * @param mode - `login` (a senha só precisa existir) ou `register` (mínimo de 8 caracteres).
 * @param email - E-mail digitado (os espaços das pontas são ignorados).
 * @param password - Senha digitada.
 */
export function validateCredentials(
  mode: 'login' | 'register',
  email: string,
  password: string,
): { readonly errors: FieldErrors; readonly values: { email: string; password: string } | null } {
  const values = { email: email.trim(), password };
  const schema = mode === 'login' ? loginInputSchema : registerInputSchema;
  const parsed = schema.safeParse(values);
  if (parsed.success) return { errors: {}, values };

  const failed = new Set(parsed.error.issues.map((issue) => String(issue.path[0])));
  return {
    errors: {
      ...(failed.has('email') ? { email: EMAIL_MESSAGE } : {}),
      ...(failed.has('password')
        ? {
            password:
              mode === 'login'
                ? 'Informe a sua senha.'
                : `Use pelo menos ${PASSWORD_MIN_LENGTH} caracteres. Uma frase longa é uma boa senha.`,
          }
        : {}),
    },
    values: null,
  };
}
