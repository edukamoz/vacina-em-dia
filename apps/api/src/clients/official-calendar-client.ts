/** Identifica o vigia perante o portal do Ministério da Saúde (sem dado pessoal). */
export const WATCH_USER_AGENT = 'vacina-em-dia-vigia/0.1';

/** Tempo máximo de espera por arquivo. O PDF do idoso levou ~5 s a partir de servidores externos. */
export const WATCH_TIMEOUT_MS = 30_000;

/** Teto do tamanho do PDF lido (8 MB): os cinco reais têm de 1 a 1,7 MB. */
export const WATCH_MAX_BYTES = 8_000_000;

/** Só se baixa do portal oficial, por HTTPS. */
const ALLOWED_PREFIX = 'https://www.gov.br/saude/';

/** Falha ao baixar um arquivo do calendário; o nome diz o motivo sem expor endereço ou conteúdo. */
export class CalendarDownloadError extends Error {
  constructor(reason: string) {
    super(`Não foi possível baixar o arquivo do calendário (${reason}).`);
    this.name = 'CalendarDownloadError';
  }
}

/** Configuração do cliente; `fetchFn` é injetável nos testes. */
export interface CalendarDownloadConfig {
  readonly fetchFn?: typeof fetch;
  readonly timeoutMs?: number;
  readonly maxBytes?: number;
}

/**
 * Cria a função que baixa um arquivo do calendário oficial e devolve os bytes. Recusa endereço fora
 * de `https://www.gov.br/saude/`, resposta que não seja 200 com PDF e arquivo acima do teto, e
 * desiste por tempo. É educada com o portal: um arquivo por vez, identificada no `User-Agent`.
 *
 * @param config - `fetch`, tempo e tamanho máximos.
 */
export function createCalendarFileFetcher({
  fetchFn = fetch,
  timeoutMs = WATCH_TIMEOUT_MS,
  maxBytes = WATCH_MAX_BYTES,
}: CalendarDownloadConfig = {}): (url: string) => Promise<Uint8Array> {
  return async (url) => {
    if (!url.startsWith(ALLOWED_PREFIX)) throw new CalendarDownloadError('endereço não permitido');
    let response: Response;
    try {
      response = await fetchFn(url, {
        headers: { 'User-Agent': WATCH_USER_AGENT, Accept: 'application/pdf' },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new CalendarDownloadError('rede ou tempo esgotado');
    }
    if (response.status !== 200) throw new CalendarDownloadError(`HTTP ${response.status}`);
    if (response.url && !response.url.startsWith(ALLOWED_PREFIX)) {
      throw new CalendarDownloadError('redirecionado para fora do portal');
    }
    if (!(response.headers.get('content-type') ?? '').toLowerCase().includes('pdf')) {
      throw new CalendarDownloadError('não é PDF');
    }
    const declared = Number(response.headers.get('content-length') ?? 0);
    if (declared > maxBytes) throw new CalendarDownloadError('arquivo grande demais');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw new CalendarDownloadError('arquivo grande demais');
    if (bytes.byteLength === 0) throw new CalendarDownloadError('arquivo vazio');
    return bytes;
  };
}
