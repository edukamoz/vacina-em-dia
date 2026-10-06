import { z } from 'zod';
import { UpstreamError, type SpeechClient, type SpeechResult } from '../services/assistant-ports';

/** Tempo máximo de espera pelo reconhecimento de fala. */
export const SPEECH_TIMEOUT_MS = 20000;

/** Idioma reconhecido. */
export const SPEECH_LANGUAGE = 'pt-BR';

const recognitionSchema = z.object({
  RecognitionStatus: z.string(),
  DisplayText: z.string().optional(),
});

/** Configuração do cliente de fala. */
export interface SpeechClientConfig {
  /** Endereço do recurso, por exemplo `https://spch-....cognitiveservices.azure.com`. */
  readonly endpoint: string;
  /** Chave do recurso (cabeçalho `Ocp-Apim-Subscription-Key`); vem do Key Vault. */
  readonly key: string;
  readonly fetchFn?: typeof fetch;
}

/**
 * Cliente da API REST de reconhecimento de fala para áudio curto do Azure AI Speech (WAV PCM de
 * 16 kHz, mono, até 60 s). O áudio segue na requisição e é descartado: nada é gravado aqui.
 *
 * @param config - Endereço, chave e `fetch` (injetável nos testes).
 */
export function createHttpSpeechClient({
  endpoint,
  key,
  fetchFn = fetch,
}: SpeechClientConfig): SpeechClient {
  const url =
    `${endpoint.replace(/\/+$/, '')}/stt/speech/recognition/conversation/cognitiveservices/v1` +
    `?language=${SPEECH_LANGUAGE}&format=simple`;

  return {
    async transcribe(wav: Uint8Array): Promise<SpeechResult> {
      let response: Response;
      try {
        response = await fetchFn(url, {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
            Accept: 'application/json',
          },
          body: wav,
          signal: AbortSignal.timeout(SPEECH_TIMEOUT_MS),
        });
      } catch {
        throw new UpstreamError();
      }
      if (!response.ok) throw new UpstreamError();

      const parsed = recognitionSchema.safeParse(await response.json().catch(() => undefined));
      if (!parsed.success) throw new UpstreamError();
      const { RecognitionStatus, DisplayText } = parsed.data;
      if (RecognitionStatus === 'Success' && DisplayText?.trim()) {
        return { ok: true, text: DisplayText.trim() };
      }
      // NoMatch, InitialSilenceTimeout e BabbleTimeout: a pessoa pode tentar de novo. "Error" é
      // falha do serviço.
      if (RecognitionStatus === 'Error') throw new UpstreamError();
      return { ok: false, reason: 'NOT_RECOGNIZED' };
    },
  };
}

/** Cliente usado quando a voz não está configurada: toda chamada falha com segurança. */
export const unavailableSpeechClient: SpeechClient = {
  transcribe: () => Promise.reject(new UpstreamError()),
};
