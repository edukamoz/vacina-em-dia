/** Resposta HTTP simples, independente do SDK das Functions para facilitar os testes. */
export interface HttpResult {
  readonly status: number;
  /** Corpo JSON. */
  readonly jsonBody?: unknown;
  /** Corpo em texto (a página HTML do Swagger UI) ou em bytes (o PDF da carteira). */
  readonly body?: string | Uint8Array;
  readonly headers?: Readonly<Record<string, string>>;
}

/**
 * Cabeçalhos de segurança de toda resposta da API: o navegador não adivinha o tipo do conteúdo
 * (`nosniff`), nada fica em cache (as respostas trazem dados de saúde ou tokens) e o endereço só
 * é aceito por HTTPS (`Strict-Transport-Security`, ignorado em `http://localhost`).
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'x-content-type-options': 'nosniff',
  'cache-control': 'no-store',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
};

/**
 * Acrescenta {@link SECURITY_HEADERS} à resposta. Um cabeçalho que o handler já definiu (por
 * exemplo, o `cache-control` das respostas com token) é mantido.
 *
 * @param result - Resposta do handler.
 */
export function withSecurityHeaders(
  result: HttpResult,
): HttpResult & { readonly headers: Readonly<Record<string, string>> } {
  return { ...result, headers: { ...SECURITY_HEADERS, ...result.headers } };
}
