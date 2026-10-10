import type { HttpResult } from '../http';
import type { WarmupService } from '../services/warmup-service';

/**
 * Handler do aquecimento (`GET /api/warmup`). Não exige login e não devolve dado algum além do
 * estado do banco.
 *
 * @param service - Serviço que acorda o banco.
 * @returns Função que monta a resposta 200.
 */
export function createWarmupHandler(service: WarmupService): () => Promise<HttpResult> {
  return async () => ({
    status: 200,
    jsonBody: { status: 'ok', database: await service.warm() },
  });
}
