import { z } from 'zod';
import { UpstreamError, type SpeechClient, type SpeechResult } from '../services/assistant-ports';
import type { FileStorage } from '../storage/file-storage';

/** Tempo máximo de espera pelo reconhecimento de fala. */
export const GOOGLE_SPEECH_TIMEOUT_MS = 20000;

/** Idioma reconhecido. */
export const GOOGLE_SPEECH_LANGUAGE = 'pt-BR';

/**
 * Teto mensal de áudio enviado ao Google, em segundos (50 minutos). A API V1 do Speech-to-Text dá os
 * primeiros 60 minutos por mês de graça (página oficial de preços); o teto deixa folga para a
 * contagem não ser atômica e para o fuso do mês do Google. Passou disso, a voz responde
 * "indisponível" e a pessoa digita a pergunta: nunca se chega à faixa paga.
 */
export const DEFAULT_VOICE_MONTHLY_SECONDS = 50 * 60;

const ENDPOINT = 'https://speech.googleapis.com/v1/speech:recognize';
const TOKEN_URL =
  'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';
const WAV_HEADER_BYTES = 44;
const WAV_BYTES_PER_SECOND = 16000 * 2;

const recognitionSchema = z.object({
  results: z
    .array(z.object({ alternatives: z.array(z.object({ transcript: z.string() })).optional() }))
    .optional(),
});

const tokenSchema = z.object({ access_token: z.string().min(1), expires_in: z.number() });

/**
 * Duração de um WAV PCM de 16 kHz, 16 bits, mono, em segundos inteiros (arredondada para cima, no
 * mínimo 1), que é como o Google cobra (por segundo).
 *
 * @param wav - Áudio WAV com cabeçalho de 44 bytes.
 */
export function wavSeconds(wav: Uint8Array): number {
  return Math.max(1, Math.ceil(Math.max(0, wav.length - WAV_HEADER_BYTES) / WAV_BYTES_PER_SECOND));
}

/** Contador de áudio enviado no mês: reserva segundos antes de chamar o Google. */
export interface VoiceBudget {
  /** Reserva `seconds` no mês; `false` se passaria do teto (nada é reservado). */
  reserve(seconds: number): Promise<boolean>;
}

/**
 * Contador mensal guardado como um arquivo pequeno (`AAAA-MM`) no armazenamento da API. A leitura e a
 * gravação não são atômicas: duas chamadas simultâneas podem passar do teto por alguns segundos, o
 * que a folga do teto cobre. Guarda só um número, nunca o áudio.
 *
 * @param options.storage - Armazenamento onde o contador fica.
 * @param options.clock - Relógio (ISO 8601); define o mês.
 * @param options.limitSeconds - Teto mensal em segundos.
 */
export function createMonthlyVoiceBudget({
  storage,
  clock,
  limitSeconds,
}: {
  readonly storage: FileStorage;
  readonly clock: () => string;
  readonly limitSeconds: number;
}): VoiceBudget {
  return {
    async reserve(seconds) {
      const key = clock().slice(0, 7);
      const stored = await storage.get(key);
      const parsed = stored ? Number(new TextDecoder().decode(stored.bytes)) : 0;
      const used = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
      if (used + seconds > limitSeconds) return false;
      await storage.put(key, {
        bytes: new TextEncoder().encode(String(used + seconds)),
        contentType: 'text/plain',
      });
      return true;
    },
  };
}

/**
 * Pega o token de acesso da conta de serviço do Cloud Run pelo servidor de metadados (sem chave
 * guardada) e o reaproveita até pouco antes de vencer.
 *
 * @param fetchFn - `fetch` (injetável nos testes).
 * @param now - Relógio em milissegundos (injetável nos testes).
 */
export function createMetadataTokenProvider(
  fetchFn: typeof fetch = fetch,
  now: () => number = Date.now,
): () => Promise<string> {
  let cached: { token: string; expiresAt: number } | undefined;
  return async () => {
    if (cached && now() < cached.expiresAt) return cached.token;
    let response: Response;
    try {
      response = await fetchFn(TOKEN_URL, {
        headers: { 'Metadata-Flavor': 'Google' },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new UpstreamError();
    }
    if (!response.ok) throw new UpstreamError();
    const parsed = tokenSchema.safeParse(await response.json().catch(() => undefined));
    if (!parsed.success) throw new UpstreamError();
    cached = {
      token: parsed.data.access_token,
      expiresAt: now() + Math.max(0, parsed.data.expires_in - 60) * 1000,
    };
    return cached.token;
  };
}

/** Configuração do cliente de fala do Google. */
export interface GoogleSpeechClientConfig {
  readonly getToken: () => Promise<string>;
  readonly budget: VoiceBudget;
  readonly fetchFn?: typeof fetch;
}

/**
 * Cliente da API V1 do Google Cloud Speech-to-Text para áudio curto (WAV PCM de 16 kHz, mono, até
 * 60 s). O áudio segue na requisição e é descartado: nada é gravado aqui. Antes de chamar, reserva os
 * segundos no contador mensal; sem saldo, falha como serviço indisponível (a V1 só é gratuita até 60
 * minutos por mês).
 *
 * @param config - Token, contador mensal e `fetch` (injetável nos testes).
 */
export function createGoogleSpeechClient({
  getToken,
  budget,
  fetchFn = fetch,
}: GoogleSpeechClientConfig): SpeechClient {
  return {
    async transcribe(wav: Uint8Array): Promise<SpeechResult> {
      if (!(await budget.reserve(wavSeconds(wav)))) throw new UpstreamError();
      const token = await getToken();
      let response: Response;
      try {
        response = await fetchFn(ENDPOINT, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: {
              encoding: 'LINEAR16',
              sampleRateHertz: 16000,
              languageCode: GOOGLE_SPEECH_LANGUAGE,
              enableAutomaticPunctuation: true,
            },
            audio: { content: Buffer.from(wav.subarray(WAV_HEADER_BYTES)).toString('base64') },
          }),
          signal: AbortSignal.timeout(GOOGLE_SPEECH_TIMEOUT_MS),
        });
      } catch {
        throw new UpstreamError();
      }
      if (!response.ok) throw new UpstreamError();

      const parsed = recognitionSchema.safeParse(await response.json().catch(() => undefined));
      if (!parsed.success) throw new UpstreamError();
      const text = (parsed.data.results ?? [])
        .map((r) => r.alternatives?.[0]?.transcript.trim() ?? '')
        .filter(Boolean)
        .join(' ');
      // Resposta vazia: o serviço processou o áudio mas não entendeu; a pessoa pode tentar de novo.
      return text ? { ok: true, text } : { ok: false, reason: 'NOT_RECOGNIZED' };
    },
  };
}
