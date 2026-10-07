import type { AssistantReply, NlpSearchResponse } from '@vacina/shared';

/** Falha ao falar com um serviço externo (PLN ou voz). Não carrega detalhe: pode ter dado pessoal. */
export class UpstreamError extends Error {
  constructor() {
    super('Serviço externo indisponível.');
    this.name = 'UpstreamError';
  }
}

/** Cliente do serviço de PLN (chatbot e busca). */
export interface NlpClient {
  /** Responde a uma pergunta em texto. */
  chat(text: string): Promise<AssistantReply>;
  /** Busca vacinas parecidas com a pergunta. */
  search(text: string): Promise<NlpSearchResponse>;
}

/** Resultado do reconhecimento de fala. */
export type SpeechResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly reason: 'NOT_RECOGNIZED' };

/** Cliente do reconhecimento de fala (Azure AI Speech). */
export interface SpeechClient {
  /** Transcreve um áudio WAV PCM de 16 kHz, mono (até 60 s). O áudio nunca é guardado. */
  transcribe(wav: Uint8Array): Promise<SpeechResult>;
}

/** Regra de limite: no máximo `limit` usos a cada `windowSeconds`. */
export interface RateRule {
  readonly name: string;
  readonly limit: number;
  readonly windowSeconds: number;
}

/** Resultado da consulta ao limitador. */
export type RateDecision =
  { readonly allowed: true } | { readonly allowed: false; readonly retryAfterSeconds: number };

/** Limitador de uso por usuário (ADR-010). */
export interface RateLimiter {
  /**
   * Registra um uso do dono em todas as regras, se nenhuma estiver esgotada; caso contrário, nega
   * sem registrar nada.
   */
  consume(ownerId: string, rules: readonly RateRule[]): Promise<RateDecision>;
}
