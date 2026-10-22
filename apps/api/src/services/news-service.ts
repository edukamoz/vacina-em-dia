import { newsResponseSchema, type NewsItem, type NewsResponse } from '@vacina/shared';
import type { OfficialNewsClient } from '../clients/official-news-client';
import type { Clock } from '../clock';
import type { RateLimiter, RateRule } from './assistant-ports';
import type { RateLimitedError } from './errors';

/** Aviso fixo que acompanha a resposta. */
export const NEWS_NOTICE =
  'O app só repassa o título e o link das notícias do Ministério da Saúde, sem resumo nem opinião. Não é orientação médica e não substitui a caderneta nem os profissionais de saúde.';

/** Fonte citada em toda resposta. */
export const NEWS_SOURCE = {
  name: 'Notícias do Ministério da Saúde',
  publisher: 'Ministério da Saúde',
  url: 'https://www.gov.br/saude/pt-br/assuntos/noticias-ms',
} as const;

/** Limite de leituras por pessoa: 30 a cada 10 minutos (ADR-010). */
const NEWS_RULES: readonly RateRule[] = [{ name: 'news-10min', limit: 30, windowSeconds: 600 }];
/** O feed é lido no máximo uma vez por hora; entre uma leitura e outra vale a cópia. */
const NEWS_TTL_MS = 60 * 60 * 1000;
/** Tempo máximo esperando o feed oficial. */
const NEWS_TIMEOUT_MS = 5000;

/** Resultado: a resposta ou o limite de uso atingido. */
export type NewsResult =
  | { readonly ok: true; readonly value: NewsResponse }
  | { readonly ok: false; readonly error: RateLimitedError };

/** Casos de uso das novidades de saúde. */
export interface NewsService {
  /**
   * Últimas notícias do Ministério da Saúde. Lê o feed no máximo a cada hora (cópia na memória);
   * se o feed falhar, devolve a última cópia boa ou uma lista vazia, nunca um erro. Nada do
   * usuário vai ao feed.
   *
   * @param ownerId - Dono da sessão (só para o limite de uso).
   */
  latest(ownerId: string): Promise<NewsResult>;
}

/** Dependências do serviço. */
export interface NewsServiceDeps {
  readonly client: OfficialNewsClient;
  readonly limiter: RateLimiter;
  readonly clock: Clock;
  readonly timeoutMs?: number;
  /** Chamada quando o feed falha: só o tipo do erro. */
  readonly reportError?: (kind: string) => void;
}

/**
 * Cria o serviço de novidades.
 *
 * @param deps - Cliente do feed, limitador e relógio.
 */
export function createNewsService(deps: NewsServiceDeps): NewsService {
  const { client, limiter, clock } = deps;
  let cache: { readonly at: number; readonly items: NewsItem[] } | null = null;
  let inFlight: Promise<void> | null = null;

  async function refresh(): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? NEWS_TIMEOUT_MS);
    try {
      const items = await client.fetchLatest(controller.signal);
      cache = { at: Date.parse(clock()), items };
    } catch (error) {
      deps.reportError?.(error instanceof Error ? error.name : 'desconhecido');
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async latest(ownerId) {
      const decision = await limiter.consume(ownerId, NEWS_RULES);
      if (!decision.allowed) {
        return {
          ok: false,
          error: {
            code: 'RATE_LIMITED',
            scope: 'news',
            retryAfterSeconds: decision.retryAfterSeconds,
          },
        };
      }
      const now = Date.parse(clock());
      if (!cache || now - cache.at >= NEWS_TTL_MS) {
        inFlight ??= refresh().finally(() => {
          inFlight = null;
        });
        await inFlight;
      }
      return {
        ok: true,
        value: newsResponseSchema.parse({
          items: cache?.items ?? [],
          source: NEWS_SOURCE,
          updatedAt: cache ? new Date(cache.at).toISOString() : null,
          notice: NEWS_NOTICE,
        }),
      };
    },
  };
}
