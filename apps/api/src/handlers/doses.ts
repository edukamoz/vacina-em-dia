import { doseEventInputSchema, doseIdSchema, type DoseResponse } from '@vacina/shared';
import type { ZodError } from 'zod';
import type { HttpResult } from '../http';
import type { DoseService, DoseServiceResult } from '../services/dose-service';
import { toErrorResult, validationErrorResult } from './http-errors';

/** Handlers HTTP de doses: finos, só validam a entrada e traduzem o resultado do serviço. */
export interface DoseHandlers {
  /** `GET /api/doses`. */
  list(): Promise<HttpResult>;
  /** `GET /api/doses/{id}`. */
  get(rawId: unknown): Promise<HttpResult>;
  /** `POST /api/doses/{id}/events`. */
  applyEvent(rawId: unknown, rawBody: unknown): Promise<HttpResult>;
}

function fieldsOf(error: ZodError, prefix: string): string[] {
  const names = error.issues.map((issue) => [prefix, ...issue.path.map(String)].join('.'));
  return [...new Set(names.length > 0 ? names : [prefix])];
}

function toDoseResult(result: DoseServiceResult): HttpResult {
  if (!result.ok) return toErrorResult(result.error);
  const { id, vaccine, doseLabel, status, dueDate, scheduledDate, appliedDate } = result.dose;
  const body: DoseResponse = {
    id,
    vaccine,
    doseLabel,
    status,
    dueDate,
    scheduledDate,
    appliedDate,
  };
  return { status: 200, jsonBody: body };
}

/**
 * Cria os handlers de doses. Toda entrada externa (id da URL e corpo) passa por esquema Zod do
 * `@vacina/shared` antes de chegar ao serviço.
 *
 * @param service - Casos de uso de dose.
 */
export function createDoseHandlers(service: DoseService): DoseHandlers {
  return {
    async list() {
      return { status: 200, jsonBody: await service.listDoses() };
    },

    async get(rawId) {
      const id = doseIdSchema.safeParse(rawId);
      if (!id.success) return validationErrorResult(['id']);
      return toDoseResult(await service.getDose(id.data));
    },

    async applyEvent(rawId, rawBody) {
      const id = doseIdSchema.safeParse(rawId);
      if (!id.success) return validationErrorResult(['id']);
      const event = doseEventInputSchema.safeParse(rawBody);
      if (!event.success) return validationErrorResult(fieldsOf(event.error, 'body'));
      return toDoseResult(await service.applyEvent(id.data, event.data));
    },
  };
}
