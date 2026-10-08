import { nearbyUnitsQuerySchema } from '@vacina/shared';
import type { HttpResult } from '../http';
import type { UnitsService } from '../services/units-service';
import { toErrorResult, validationErrorResult } from './http-errors';
import { fieldsOf } from './validation';

/** Handlers HTTP do mapa de postos de saúde (RF10). */
export interface UnitsHandlers {
  /** `GET /api/units/nearby`: unidades básicas de saúde perto de uma posição. */
  nearby(ownerId: string, rawQuery: unknown): Promise<HttpResult>;
}

/**
 * Cria os handlers do mapa de postos. Os parâmetros da URL passam por esquema Zod; a posição nunca
 * vai para o log.
 *
 * @param service - Casos de uso do mapa de postos.
 */
export function createUnitsHandlers(service: UnitsService): UnitsHandlers {
  return {
    async nearby(ownerId, rawQuery) {
      const query = nearbyUnitsQuerySchema.safeParse(rawQuery);
      if (!query.success) return validationErrorResult(fieldsOf(query.error, 'query'));
      const result = await service.nearby(ownerId, query.data);
      return result.ok ? { status: 200, jsonBody: result.value } : toErrorResult(result.error);
    },
  };
}
