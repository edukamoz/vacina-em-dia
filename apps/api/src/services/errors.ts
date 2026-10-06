import type { TransitionError } from '@vacina/shared';

/** Recurso não encontrado (ou que pertence a outro usuário: a API não distingue os dois casos). */
export interface NotFoundError {
  readonly code: 'NOT_FOUND';
}

/** O usuário ainda não deu o consentimento (RF09). */
export interface ConsentRequiredError {
  readonly code: 'CONSENT_REQUIRED';
}

/** Menor de idade cadastrado sem a declaração de responsável (LGPD). */
export interface GuardianDeclarationRequiredError {
  readonly code: 'GUARDIAN_DECLARATION_REQUIRED';
}

/** Data de nascimento no futuro. */
export interface InvalidBirthDateError {
  readonly code: 'INVALID_BIRTH_DATE';
}

/** Limite de membros por conta atingido. */
export interface LimitReachedError {
  readonly code: 'LIMIT_REACHED';
}

/** Limite de uso do assistente atingido (ADR-010). */
export interface RateLimitedError {
  readonly code: 'RATE_LIMITED';
  /** Segundos até a próxima janela livre. */
  readonly retryAfterSeconds: number;
}

/** O serviço de PLN ou de voz não respondeu ou não está configurado. */
export interface AssistantUnavailableError {
  readonly code: 'ASSISTANT_UNAVAILABLE';
}

/** A fala não foi entendida (silêncio, ruído ou outro idioma). */
export interface SpeechNotRecognizedError {
  readonly code: 'SPEECH_NOT_RECOGNIZED';
}

/** O áudio não está no formato aceito (WAV PCM de 16 kHz, mono). */
export interface UnsupportedAudioError {
  readonly code: 'UNSUPPORTED_AUDIO';
}

/** O áudio é maior que o limite aceito. */
export interface AudioTooLargeError {
  readonly code: 'AUDIO_TOO_LARGE';
}

/** Erros de domínio dos casos de uso, mapeados para HTTP em um único ponto. */
export type ServiceError =
  | NotFoundError
  | ConsentRequiredError
  | GuardianDeclarationRequiredError
  | InvalidBirthDateError
  | LimitReachedError
  | RateLimitedError
  | AssistantUnavailableError
  | SpeechNotRecognizedError
  | UnsupportedAudioError
  | AudioTooLargeError
  | TransitionError;

/** Resultado de um caso de uso: o valor ou um erro de domínio, nunca uma exceção. */
export type Result<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: ServiceError };

/** Atalho para um resultado de sucesso. */
export function success<T>(value: T): Result<T> {
  return { ok: true, value };
}

/** Atalho para um resultado de erro. */
export function failure<T = never>(error: ServiceError): Result<T> {
  return { ok: false, error };
}
