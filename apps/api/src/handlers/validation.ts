import type { ZodError } from 'zod';

/**
 * Nomes dos campos inválidos de um erro do Zod, prefixados (`body`, `id`...). Nunca inclui os
 * valores enviados, que poderiam conter dado pessoal.
 *
 * @param error - Erro de validação.
 * @param prefix - Origem dos campos (por exemplo, `body`).
 */
export function fieldsOf(error: ZodError, prefix: string): string[] {
  const names = error.issues.map((issue) => [prefix, ...issue.path.map(String)].join('.'));
  return [...new Set(names.length > 0 ? names : [prefix])];
}
