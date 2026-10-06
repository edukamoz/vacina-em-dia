import { doseEventInputSchema, doseIdSchema } from '@vacina/shared';
import type { HttpResult } from '../http';
import type { DoseService } from '../services/dose-service';
import type { Result } from '../services/errors';
import { toErrorResult, validationErrorResult } from './http-errors';
import { fieldsOf } from './validation';

/** Handlers HTTP de doses: finos, só validam a entrada e traduzem o resultado do serviço. */
export interface DoseHandlers {
  /** `GET /api/doses/{id}`. */
  get(ownerId: string, rawId: unknown): Promise<HttpResult>;
  /** `POST /api/doses/{id}/events`. */
  applyEvent(ownerId: string, rawId: unknown, rawBody: unknown): Promise<HttpResult>;
}

function toResult<T>(result: Result<T>): HttpResult {
  return result.ok ? { status: 200, jsonBody: result.value } : toErrorResult(result.error);
}

/**
 * Cria os handlers de doses. Toda entrada externa (id da URL e corpo) passa por esquema Zod do
 * `@vacina/shared` antes de chegar ao serviço.
 *
 * @param service - Casos de uso de dose.
 */
export function createDoseHandlers(service: DoseService): DoseHandlers {
  return {
    async get(ownerId, rawId) {
      const id = doseIdSchema.safeParse(rawId);
      if (!id.success) return validationErrorResult(['id']);
      return toResult(await service.get(ownerId, id.data));
    },

    async applyEvent(ownerId, rawId, rawBody) {
      const id = doseIdSchema.safeParse(rawId);
      if (!id.success) return validationErrorResult(['id']);
      const event = doseEventInputSchema.safeParse(rawBody);
      if (!event.success) return validationErrorResult(fieldsOf(event.error, 'body'));
      return toResult(await service.applyEvent(ownerId, id.data, event.data));
    },
  };
}
