import type { HttpResult } from '../http';
import type { NewsService } from '../services/news-service';
import { toErrorResult } from './http-errors';

/** Handlers HTTP das novidades de saúde. */
export interface NewsHandlers {
  /** `GET /api/news`: últimas notícias do Ministério da Saúde. */
  latest(ownerId: string): Promise<HttpResult>;
}

/**
 * Cria os handlers das novidades.
 *
 * @param service - Casos de uso das novidades.
 */
export function createNewsHandlers(service: NewsService): NewsHandlers {
  return {
    async latest(ownerId) {
      const result = await service.latest(ownerId);
      return result.ok ? { status: 200, jsonBody: result.value } : toErrorResult(result.error);
    },
  };
}
