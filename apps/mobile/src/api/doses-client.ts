import { doseListResponseSchema, type DoseListResponse } from '@vacina/shared';

/** Tipo de falha ao chamar a API: sem rede, resposta de erro ou resposta fora do contrato. */
export type ApiRequestErrorKind = 'network' | 'server' | 'invalid-response';

/** Erro de chamada à API. A mensagem é segura para mostrar ao usuário (sem detalhe técnico). */
export class ApiRequestError extends Error {
  constructor(readonly kind: ApiRequestErrorKind) {
    super('Não foi possível carregar as doses. Verifique a conexão e tente de novo.');
    this.name = 'ApiRequestError';
  }
}

/** Parâmetros de `fetchDoses`. */
export interface FetchDosesOptions {
  /** URL base da API, sem barra final. */
  readonly baseUrl: string;
  /** `fetch` injetável, para testar sem rede. */
  readonly fetchFn?: typeof fetch;
  /** Sinal para cancelar a chamada (o TanStack Query o fornece). */
  readonly signal?: AbortSignal;
}

/**
 * Busca a lista de doses (`GET /doses`) e valida a resposta com o mesmo esquema Zod da API, para
 * que uma resposta fora do contrato nunca chegue à interface.
 *
 * @param options - URL base, `fetch` e sinal de cancelamento.
 * @returns A lista de doses com a fonte e a versão do calendário.
 * @throws ApiRequestError quando a rede falha, a API devolve erro ou a resposta é inválida.
 */
export async function fetchDoses({
  baseUrl,
  fetchFn = fetch,
  signal,
}: FetchDosesOptions): Promise<DoseListResponse> {
  let response: Response;
  try {
    response = await fetchFn(`${baseUrl}/doses`, {
      headers: { Accept: 'application/json' },
      ...(signal ? { signal } : {}),
    });
  } catch {
    throw new ApiRequestError('network');
  }
  if (!response.ok) throw new ApiRequestError('server');

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiRequestError('invalid-response');
  }
  const parsed = doseListResponseSchema.safeParse(body);
  if (!parsed.success) throw new ApiRequestError('invalid-response');
  return parsed.data;
}
