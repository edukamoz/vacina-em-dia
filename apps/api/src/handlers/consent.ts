import { consentInputSchema } from '@vacina/shared';
import type { HttpResult } from '../http';
import type { ConsentService } from '../services/consent-service';
import { validationErrorResult } from './http-errors';
import { fieldsOf } from './validation';

/** Handlers HTTP do consentimento (RF09). */
export interface ConsentHandlers {
  /** `GET /api/consent`. */
  get(ownerId: string): Promise<HttpResult>;
  /** `PUT /api/consent`. */
  accept(ownerId: string, rawBody: unknown): Promise<HttpResult>;
}

/**
 * Cria os handlers do consentimento.
 *
 * @param service - Casos de uso do consentimento.
 */
export function createConsentHandlers(service: ConsentService): ConsentHandlers {
  return {
    async get(ownerId) {
      return { status: 200, jsonBody: await service.get(ownerId) };
    },

    async accept(ownerId, rawBody) {
      const input = consentInputSchema.safeParse(rawBody);
      if (!input.success) return validationErrorResult(fieldsOf(input.error, 'body'));
      return { status: 200, jsonBody: await service.accept(ownerId, input.data) };
    },
  };
}
