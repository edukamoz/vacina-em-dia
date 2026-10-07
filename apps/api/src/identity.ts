/** Nome do cabeçalho que identifica a sessão de demonstração. */
export const DEMO_SESSION_HEADER = 'x-demo-session';

const DEMO_SESSION_PATTERN = /^[a-z0-9-]{16,64}$/;
const BEARER_PATTERN = /^Bearer ([A-Za-z0-9_.-]{20,2048})$/;

/**
 * Descobre o dono dos dados a partir do cabeçalho da sessão de demonstração (ADR-013).
 *
 * **Provisório e sem autenticação:** quem souber o identificador acessa os dados. Fica só para
 * desenvolvimento e para a transição até o app usar o login (ADR-014); em produção é desligado com
 * `DEMO_SESSION_ENABLED=false`.
 *
 * @param headerValue - Valor do cabeçalho `x-demo-session`, se enviado.
 * @returns O identificador do dono ou `undefined` quando ausente ou fora do formato.
 */
export function resolveDemoOwner(headerValue: string | null | undefined): string | undefined {
  if (!headerValue) return undefined;
  return DEMO_SESSION_PATTERN.test(headerValue) ? headerValue : undefined;
}

/** Cabeçalhos relevantes de uma requisição. */
export interface IdentityHeaders {
  readonly authorization?: string | null;
  readonly demoSession?: string | null;
}

/** Opções para descobrir o dono. */
export interface ResolveOwnerOptions {
  /** Valida o token de acesso e devolve o id da conta. */
  readonly authenticate: (accessToken: string) => string | undefined;
  /** Aceita o cabeçalho de demonstração quando não há `Authorization`. */
  readonly demoEnabled: boolean;
}

/**
 * Descobre o dono dos dados da requisição. Com `Authorization: Bearer`, só vale o token (se for
 * inválido, não há alternativa: o cabeçalho de demonstração **não** é usado como segunda chance).
 * Sem `Authorization`, usa a sessão de demonstração quando habilitada.
 *
 * @param headers - Cabeçalhos da requisição.
 * @param options - Validador de token e se a demonstração está ligada.
 * @returns O identificador do dono ou `undefined` (responder 401).
 */
export function resolveOwner(
  headers: IdentityHeaders,
  options: ResolveOwnerOptions,
): string | undefined {
  if (headers.authorization) {
    const token = BEARER_PATTERN.exec(headers.authorization)?.[1];
    return token ? options.authenticate(token) : undefined;
  }
  return options.demoEnabled ? resolveDemoOwner(headers.demoSession) : undefined;
}
