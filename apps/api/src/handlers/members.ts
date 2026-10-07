import { customDoseInputSchema, memberIdSchema, memberInputSchema } from '@vacina/shared';
import type { HttpResult } from '../http';
import type { DoseService } from '../services/dose-service';
import type { Result } from '../services/errors';
import type { MemberService } from '../services/member-service';
import { toErrorResult, validationErrorResult } from './http-errors';
import { fieldsOf } from './validation';

/** Handlers HTTP dos membros da família e do calendário de cada um. */
export interface MemberHandlers {
  /** `GET /api/members`. */
  list(ownerId: string): Promise<HttpResult>;
  /** `POST /api/members`. */
  create(ownerId: string, rawBody: unknown): Promise<HttpResult>;
  /** `GET /api/members/{id}`. */
  get(ownerId: string, rawId: unknown): Promise<HttpResult>;
  /** `PUT /api/members/{id}`. */
  update(ownerId: string, rawId: unknown, rawBody: unknown): Promise<HttpResult>;
  /** `DELETE /api/members/{id}`. */
  remove(ownerId: string, rawId: unknown): Promise<HttpResult>;
  /** `GET /api/members/{id}/doses`. */
  listDoses(ownerId: string, rawId: unknown): Promise<HttpResult>;
  /** `POST /api/members/{id}/doses`. */
  addCustomDose(ownerId: string, rawId: unknown, rawBody: unknown): Promise<HttpResult>;
}

function toResult<T>(result: Result<T>, status = 200): HttpResult {
  return result.ok ? { status, jsonBody: result.value } : toErrorResult(result.error);
}

/**
 * Cria os handlers de membros. Entradas externas passam por esquema Zod do `@vacina/shared`.
 *
 * @param members - Casos de uso dos membros.
 * @param doses - Casos de uso de dose (para o calendário do membro).
 */
export function createMemberHandlers(members: MemberService, doses: DoseService): MemberHandlers {
  return {
    async list(ownerId) {
      return { status: 200, jsonBody: { items: await members.list(ownerId) } };
    },

    async create(ownerId, rawBody) {
      const input = memberInputSchema.safeParse(rawBody);
      if (!input.success) return validationErrorResult(fieldsOf(input.error, 'body'));
      return toResult(await members.create(ownerId, input.data), 201);
    },

    async get(ownerId, rawId) {
      const id = memberIdSchema.safeParse(rawId);
      if (!id.success) return validationErrorResult(['id']);
      return toResult(await members.get(ownerId, id.data));
    },

    async update(ownerId, rawId, rawBody) {
      const id = memberIdSchema.safeParse(rawId);
      if (!id.success) return validationErrorResult(['id']);
      const input = memberInputSchema.safeParse(rawBody);
      if (!input.success) return validationErrorResult(fieldsOf(input.error, 'body'));
      return toResult(await members.update(ownerId, id.data, input.data));
    },

    async remove(ownerId, rawId) {
      const id = memberIdSchema.safeParse(rawId);
      if (!id.success) return validationErrorResult(['id']);
      const result = await members.remove(ownerId, id.data);
      return result.ok ? { status: 204 } : toErrorResult(result.error);
    },

    async listDoses(ownerId, rawId) {
      const id = memberIdSchema.safeParse(rawId);
      if (!id.success) return validationErrorResult(['id']);
      return toResult(await doses.listForMember(ownerId, id.data));
    },

    async addCustomDose(ownerId, rawId, rawBody) {
      const id = memberIdSchema.safeParse(rawId);
      if (!id.success) return validationErrorResult(['id']);
      const input = customDoseInputSchema.safeParse(rawBody);
      if (!input.success) return validationErrorResult(fieldsOf(input.error, 'body'));
      return toResult(await members.addCustomDose(ownerId, id.data, input.data), 201);
    },
  };
}
