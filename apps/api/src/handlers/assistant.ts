import { assistantMessageInputSchema } from '@vacina/shared';
import type { HttpResult } from '../http';
import type { AssistantService } from '../services/assistant-service';
import { toErrorResult, validationErrorResult } from './http-errors';
import { fieldsOf } from './validation';

/** Tipos de áudio aceitos na rota de voz. */
const WAV_CONTENT_TYPE = /^audio\/(x-)?wav\b/i;

/** Handlers HTTP do assistente (chatbot e voz). */
export interface AssistantHandlers {
  /** `POST /api/assistant/message`: pergunta em texto. */
  message(ownerId: string, rawBody: unknown): Promise<HttpResult>;
  /** `POST /api/assistant/voice`: áudio WAV PCM de 16 kHz, mono. */
  voice(
    ownerId: string,
    contentType: string | null | undefined,
    audio: Uint8Array,
  ): Promise<HttpResult>;
}

/**
 * Cria os handlers do assistente. A pergunta em texto passa por esquema Zod; o áudio só é aceito
 * como `audio/wav`.
 *
 * @param service - Casos de uso do assistente.
 */
export function createAssistantHandlers(service: AssistantService): AssistantHandlers {
  return {
    async message(ownerId, rawBody) {
      const input = assistantMessageInputSchema.safeParse(rawBody);
      if (!input.success) return validationErrorResult(fieldsOf(input.error, 'body'));
      const result = await service.message(ownerId, input.data.text);
      return result.ok ? { status: 200, jsonBody: result.value } : toErrorResult(result.error);
    },

    async voice(ownerId, contentType, audio) {
      if (!contentType || !WAV_CONTENT_TYPE.test(contentType)) {
        return toErrorResult({ code: 'UNSUPPORTED_AUDIO' });
      }
      const result = await service.voice(ownerId, audio);
      return result.ok ? { status: 200, jsonBody: result.value } : toErrorResult(result.error);
    },
  };
}
