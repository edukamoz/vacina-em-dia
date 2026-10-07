import { apiErrorSchema } from '@vacina/shared';
import type { z } from 'zod';

/** Tipo de falha ao chamar a API: sem rede, resposta de erro ou resposta fora do contrato. */
export type ApiRequestErrorKind = 'network' | 'server' | 'invalid-response';

const MESSAGES: Readonly<Record<ApiRequestErrorKind, string>> = {
  network: 'Não foi possível falar com o servidor. Verifique a internet e tente de novo.',
  server: 'O servidor não conseguiu responder agora. Tente de novo em instantes.',
  'invalid-response': 'Recebemos uma resposta inesperada do servidor. Tente de novo em instantes.',
};

/**
 * Erro de chamada à API. A mensagem é segura para mostrar ao usuário (sem detalhe técnico); quando
 * a API devolve um erro conhecido, a mensagem dela, já em linguagem simples, é usada.
 */
export class ApiRequestError extends Error {
  constructor(
    readonly kind: ApiRequestErrorKind,
    readonly status?: number,
    /** Código de erro da API (`CONSENT_REQUIRED`, `GUARD_VIOLATION`...), quando houver. */
    readonly code?: string,
    serverMessage?: string,
  ) {
    super(serverMessage ?? MESSAGES[kind]);
    this.name = 'ApiRequestError';
  }
}

/** Contexto de toda chamada: endereço da API, identificação do usuário e `fetch` injetável. */
export interface ApiContext {
  /** URL base da API, sem barra final. */
  readonly baseUrl: string;
  /** Sessão de demonstração (cabeçalho `x-demo-session`): só para testes e desenvolvimento. */
  readonly sessionId?: string;
  /** Token de acesso atual do login (cabeçalho `Authorization: Bearer`), se houver sessão. */
  readonly getAccessToken?: () => Promise<string | undefined>;
  /**
   * Renova a sessão quando a API responde 401 e devolve o novo token de acesso, ou `undefined`
   * se não foi possível (a sessão terminou). A chamada é repetida uma única vez.
   */
  readonly refreshAccessToken?: () => Promise<string | undefined>;
  readonly fetchFn?: typeof fetch;
}

/** Opções de uma chamada. */
export interface RequestOptions {
  readonly path: string;
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly body?: unknown;
  /** Corpo binário (por exemplo, áudio); no lugar de `body`, com o `contentType` informado. */
  readonly binary?: { readonly data: Uint8Array; readonly contentType: string };
  /** Sinal para cancelar a chamada (o TanStack Query o fornece). */
  readonly signal?: AbortSignal;
  /** Chamadas de login e cadastro não levam token nem tentam renovar a sessão. */
  readonly anonymous?: boolean;
}

async function sendOnce(
  context: ApiContext,
  { path, method = 'GET', body, binary, signal, anonymous }: RequestOptions,
  accessToken: string | undefined,
): Promise<Response> {
  const { baseUrl, sessionId, fetchFn = fetch } = context;
  const contentType = binary?.contentType ?? (body === undefined ? undefined : 'application/json');
  const payload = binary
    ? (binary.data as BodyInit)
    : body === undefined
      ? undefined
      : JSON.stringify(body);
  const identity: Record<string, string> = anonymous
    ? {}
    : accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : sessionId
        ? { 'x-demo-session': sessionId }
        : {};
  try {
    return await fetchFn(`${baseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...identity,
        ...(contentType ? { 'Content-Type': contentType } : {}),
      },
      ...(payload === undefined ? {} : { body: payload }),
      ...(signal ? { signal } : {}),
    });
  } catch {
    throw new ApiRequestError('network');
  }
}

async function send(context: ApiContext, options: RequestOptions): Promise<Response> {
  let token = options.anonymous ? undefined : await context.getAccessToken?.();
  let response = await sendOnce(context, options, token);
  if (response.status === 401 && !options.anonymous && context.refreshAccessToken) {
    token = await context.refreshAccessToken();
    if (token) response = await sendOnce(context, options, token);
  }
  if (response.ok) return response;

  const parsed = apiErrorSchema.safeParse(await response.json().catch(() => undefined));
  throw parsed.success
    ? new ApiRequestError('server', response.status, parsed.data.code, parsed.data.message)
    : new ApiRequestError('server', response.status);
}

/**
 * Faz uma chamada e valida a resposta com o mesmo esquema Zod da API, para que uma resposta fora
 * do contrato nunca chegue à interface.
 *
 * @param context - Endereço da API, sessão e `fetch`.
 * @param options - Caminho, método, corpo e sinal.
 * @param schema - Esquema da resposta de sucesso.
 * @returns O corpo já validado.
 * @throws ApiRequestError quando a rede falha, a API devolve erro ou a resposta é inválida.
 */
export async function apiRequest<S extends z.ZodType>(
  context: ApiContext,
  options: RequestOptions,
  schema: S,
): Promise<z.infer<S>> {
  const response = await send(context, options);
  const body: unknown = await response.json().catch(() => undefined);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiRequestError('invalid-response', response.status);
  return parsed.data;
}

/**
 * Faz uma chamada cuja resposta de sucesso não tem corpo (HTTP 204).
 *
 * @param context - Endereço da API, sessão e `fetch`.
 * @param options - Caminho, método, corpo e sinal.
 * @throws ApiRequestError quando a rede falha ou a API devolve erro.
 */
export async function apiRequestNoContent(
  context: ApiContext,
  options: RequestOptions,
): Promise<void> {
  await send(context, options);
}
