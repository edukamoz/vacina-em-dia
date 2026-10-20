import { profilePhotoSchema } from '@vacina/shared';
import type { HttpResult } from '../http';
import type { ProfilePhotoService } from '../services/profile-photo-service';
import { toErrorResult, validationErrorResult } from './http-errors';
import { fieldsOf } from './validation';

/** Handlers HTTP da foto de perfil. */
export interface ProfilePhotoHandlers {
  /** `GET /api/account/photo`. */
  get(ownerId: string): Promise<HttpResult>;
  /** `PUT /api/account/photo`. */
  put(ownerId: string, rawBody: unknown): Promise<HttpResult>;
  /** `DELETE /api/account/photo`. */
  remove(ownerId: string): Promise<HttpResult>;
}

/**
 * Cria os handlers da foto de perfil. A resposta com a foto nunca vai para o cache do navegador.
 *
 * @param service - Casos de uso da foto de perfil.
 */
export function createProfilePhotoHandlers(service: ProfilePhotoService): ProfilePhotoHandlers {
  return {
    async get(ownerId) {
      const result = await service.get(ownerId);
      if (!result.ok) return toErrorResult(result.error);
      return {
        status: 200,
        jsonBody: result.value,
        headers: { 'cache-control': 'private, no-store' },
      };
    },

    async put(ownerId, rawBody) {
      const input = profilePhotoSchema.safeParse(rawBody);
      if (!input.success) return validationErrorResult(fieldsOf(input.error, 'body'));
      const result = await service.put(ownerId, input.data);
      if (!result.ok) return toErrorResult(result.error);
      return { status: 204 };
    },

    async remove(ownerId) {
      const result = await service.remove(ownerId);
      if (!result.ok) return toErrorResult(result.error);
      return { status: 204 };
    },
  };
}
