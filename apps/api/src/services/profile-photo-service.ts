import { PROFILE_PHOTO_MAX_BYTES, PROFILE_PHOTO_TYPES, type ProfilePhoto } from '@vacina/shared';
import type { FileStorage } from '../storage/file-storage';
import type { RateLimiter, RateRule } from './assistant-ports';
import { failure, success, type Result } from './errors';

/** No máximo 10 trocas de foto por hora e por conta (ADR-010). */
const PHOTO_RULES: readonly RateRule[] = [{ name: 'photo-hour', limit: 10, windowSeconds: 3600 }];

/** Casos de uso da foto de perfil da conta. */
export interface ProfilePhotoService {
  /** Guarda a foto (substitui a anterior). */
  put(ownerId: string, photo: ProfilePhoto): Promise<Result<void>>;
  /** Devolve a foto da conta, ou `NOT_FOUND` se não houver. */
  get(ownerId: string): Promise<Result<ProfilePhoto>>;
  /** Remove a foto; não falha se não houver. */
  remove(ownerId: string): Promise<Result<void>>;
}

/** Dependências do serviço da foto de perfil. */
export interface ProfilePhotoServiceDeps {
  readonly storage: FileStorage;
  readonly limiter: RateLimiter;
  /** Chamada quando o armazenamento falha: só o tipo do erro, nunca dados. */
  readonly reportError?: (kind: string) => void;
}

/** Chave do arquivo no armazenamento: uma foto por conta, nomeada pelo identificador opaco. */
function keyOf(ownerId: string): string {
  return `perfil/${ownerId}`;
}

/**
 * Confere os primeiros bytes (o "número mágico") contra o formato declarado, para não aceitar um
 * arquivo qualquer só porque o cliente disse que era uma imagem.
 *
 * @param bytes - Conteúdo do arquivo.
 * @param contentType - Formato declarado pelo cliente.
 */
export function matchesDeclaredType(bytes: Uint8Array, contentType: string): boolean {
  const at = (i: number) => bytes[i] ?? -1;
  switch (contentType) {
    case 'image/jpeg':
      return at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff;
    case 'image/png':
      return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => at(i) === b);
    case 'image/webp':
      return (
        [0x52, 0x49, 0x46, 0x46].every((b, i) => at(i) === b) &&
        [0x57, 0x45, 0x42, 0x50].every((b, i) => at(8 + i) === b)
      );
    default:
      return false;
  }
}

/**
 * Cria os casos de uso da foto de perfil. A foto é dado pessoal: só o dono lê, troca e apaga (a
 * chave vem do identificador da sessão, nunca do cliente), e ela some junto com a conta.
 *
 * @param deps - Armazenamento, limitador de uso e relato de falhas.
 */
export function createProfilePhotoService(deps: ProfilePhotoServiceDeps): ProfilePhotoService {
  const { storage, limiter } = deps;

  async function guarded<T>(run: () => Promise<Result<T>>): Promise<Result<T>> {
    try {
      return await run();
    } catch (error) {
      deps.reportError?.(error instanceof Error ? error.name : 'desconhecido');
      return failure({ code: 'STORAGE_UNAVAILABLE' });
    }
  }

  return {
    async put(ownerId, photo) {
      const decision = await limiter.consume(ownerId, PHOTO_RULES);
      if (!decision.allowed) {
        return failure({
          code: 'RATE_LIMITED',
          scope: 'photo',
          retryAfterSeconds: decision.retryAfterSeconds,
        });
      }
      if (!(PROFILE_PHOTO_TYPES as readonly string[]).includes(photo.contentType)) {
        return failure({ code: 'INVALID_IMAGE' });
      }
      const bytes = new Uint8Array(Buffer.from(photo.data, 'base64'));
      if (bytes.length > PROFILE_PHOTO_MAX_BYTES) return failure({ code: 'IMAGE_TOO_LARGE' });
      if (!matchesDeclaredType(bytes, photo.contentType)) {
        return failure({ code: 'INVALID_IMAGE' });
      }
      return guarded(async () => {
        await storage.put(keyOf(ownerId), { bytes, contentType: photo.contentType });
        return success(undefined);
      });
    },

    async get(ownerId) {
      return guarded(async () => {
        const file = await storage.get(keyOf(ownerId));
        if (!file) return failure({ code: 'NOT_FOUND' });
        return success({
          contentType: file.contentType as ProfilePhoto['contentType'],
          data: Buffer.from(file.bytes).toString('base64'),
        });
      });
    },

    async remove(ownerId) {
      return guarded(async () => {
        await storage.remove(keyOf(ownerId));
        return success(undefined);
      });
    },
  };
}
