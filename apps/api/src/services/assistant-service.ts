import type { AssistantResponse } from '@vacina/shared';
import {
  UpstreamError,
  type NlpClient,
  type RateLimiter,
  type RateRule,
  type SpeechClient,
} from './assistant-ports';
import { failure, success, type Result } from './errors';

/** Tamanho máximo do áudio: 60 s de WAV PCM 16 kHz mono (16 bits) mais o cabeçalho. */
export const MAX_AUDIO_BYTES = 60 * 16000 * 2 + 1024;

/** Tamanho mínimo de um WAV válido: o cabeçalho de 44 bytes. */
const MIN_WAV_BYTES = 44;

/** Limites de uso (valores iniciais do ADR-010; a calibragem usa dados reais). */
export const CHAT_RULES: readonly RateRule[] = [
  { name: 'chat-hora', limit: 60, windowSeconds: 3600 },
];
export const VOICE_RULES: readonly RateRule[] = [
  { name: 'voz-hora', limit: 20, windowSeconds: 3600 },
  { name: 'voz-dia', limit: 60, windowSeconds: 86400 },
];

/** Casos de uso do assistente (RF06 e RF07). */
export interface AssistantService {
  /** Responde a uma pergunta em texto. */
  message(ownerId: string, text: string): Promise<Result<AssistantResponse>>;
  /** Transcreve a fala, responde e busca vacinas parecidas. O áudio é descartado. */
  voice(ownerId: string, wav: Uint8Array): Promise<Result<AssistantResponse>>;
}

/** Dependências do serviço, todas injetadas para testar sem rede. */
export interface AssistantServiceDeps {
  readonly nlp: NlpClient;
  readonly speech: SpeechClient;
  readonly limiter: RateLimiter;
}

function isWav(bytes: Uint8Array): boolean {
  const tag = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  return bytes.length >= MIN_WAV_BYTES && tag(0) === 'RIFF' && tag(8) === 'WAVE';
}

/**
 * Cria os casos de uso do assistente. A API só orquestra: a resposta vem do serviço de PLN (curada)
 * e a fala é transcrita pelo Azure AI Speech. Nada do que a pessoa pergunta ou fala é guardado nem
 * registrado em log (LGPD).
 *
 * @param deps - Clientes do PLN e da voz e o limitador de uso.
 */
export function createAssistantService({
  nlp,
  speech,
  limiter,
}: AssistantServiceDeps): AssistantService {
  async function answer(
    text: string,
    transcript: string | null,
  ): Promise<Result<AssistantResponse>> {
    try {
      const [reply, search] = await Promise.all([nlp.chat(text), nlp.search(text)]);
      return success({ transcript, reply, results: search.results, notice: search.notice });
    } catch (error) {
      if (error instanceof UpstreamError) return failure({ code: 'ASSISTANT_UNAVAILABLE' });
      throw error;
    }
  }

  return {
    async message(ownerId, text) {
      const decision = await limiter.consume(ownerId, CHAT_RULES);
      if (!decision.allowed) {
        return failure({ code: 'RATE_LIMITED', retryAfterSeconds: decision.retryAfterSeconds });
      }
      return answer(text, null);
    },

    async voice(ownerId, wav) {
      if (wav.length > MAX_AUDIO_BYTES) return failure({ code: 'AUDIO_TOO_LARGE' });
      if (!isWav(wav)) return failure({ code: 'UNSUPPORTED_AUDIO' });

      const decision = await limiter.consume(ownerId, VOICE_RULES);
      if (!decision.allowed) {
        return failure({ code: 'RATE_LIMITED', retryAfterSeconds: decision.retryAfterSeconds });
      }

      let heard;
      try {
        heard = await speech.transcribe(wav);
      } catch (error) {
        if (error instanceof UpstreamError) return failure({ code: 'ASSISTANT_UNAVAILABLE' });
        throw error;
      }
      if (!heard.ok) return failure({ code: 'SPEECH_NOT_RECOGNIZED' });
      return answer(heard.text, heard.text);
    },
  };
}
