import { guardianIdSchema, joinInputSchema, transferInputSchema } from '@vacina/shared';
import type { HttpResult } from '../http';
import type { HouseholdService } from '../services/household-service';
import type { Result } from '../services/errors';
import { toErrorResult, validationErrorResult } from './http-errors';
import { fieldsOf } from './validation';

/** Handlers HTTP da família com vários responsáveis (ADR-029). */
export interface HouseholdHandlers {
  /** `GET /api/family`. */
  get(ownerId: string): Promise<HttpResult>;
  /** `POST /api/family/invites`. */
  createInvite(ownerId: string): Promise<HttpResult>;
  /** `DELETE /api/family/invites`. */
  revokeInvites(ownerId: string): Promise<HttpResult>;
  /** `POST /api/family/join`. */
  join(ownerId: string, rawBody: unknown): Promise<HttpResult>;
  /** `POST /api/family/leave`. */
  leave(ownerId: string): Promise<HttpResult>;
  /** `DELETE /api/family/guardians/{id}`. */
  removeGuardian(ownerId: string, rawId: unknown): Promise<HttpResult>;
  /** `POST /api/family/transfer`. */
  transfer(ownerId: string, rawBody: unknown): Promise<HttpResult>;
}

function toResult<T>(result: Result<T>, status = 200): HttpResult {
  return result.ok ? { status, jsonBody: result.value } : toErrorResult(result.error);
}

function noContent(result: Result<null>): HttpResult {
  return result.ok ? { status: 204 } : toErrorResult(result.error);
}

/**
 * Cria os handlers da família. Toda entrada externa (corpo e identificador da URL) passa por
 * esquema Zod do `@vacina/shared` antes de chegar ao serviço.
 *
 * @param service - Casos de uso da família.
 */
export function createHouseholdHandlers(service: HouseholdService): HouseholdHandlers {
  return {
    async get(ownerId) {
      return toResult(await service.get(ownerId));
    },
    async createInvite(ownerId) {
      return toResult(await service.createInvite(ownerId), 201);
    },
    async revokeInvites(ownerId) {
      return noContent(await service.revokeInvites(ownerId));
    },
    async join(ownerId, rawBody) {
      const input = joinInputSchema.safeParse(rawBody);
      if (!input.success) return validationErrorResult(fieldsOf(input.error, 'body'));
      return toResult(await service.join(ownerId, input.data));
    },
    async leave(ownerId) {
      return noContent(await service.leave(ownerId));
    },
    async removeGuardian(ownerId, rawId) {
      const id = guardianIdSchema.safeParse(rawId);
      if (!id.success) return validationErrorResult(['id']);
      return noContent(await service.removeGuardian(ownerId, id.data));
    },
    async transfer(ownerId, rawBody) {
      const input = transferInputSchema.safeParse(rawBody);
      if (!input.success) return validationErrorResult(fieldsOf(input.error, 'body'));
      return toResult(await service.transfer(ownerId, input.data));
    },
  };
}
