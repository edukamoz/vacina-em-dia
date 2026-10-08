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

/** Data prevista de uma dose avulsa fora do permitido (antes de hoje ou longe demais). */
export interface InvalidDoseDateError {
  readonly code: 'INVALID_DOSE_DATE';
}

/** Limite atingido: de membros por conta (padrão) ou de doses avulsas por pessoa. */
export interface LimitReachedError {
  readonly code: 'LIMIT_REACHED';
  /** O que atingiu o limite; muda só a mensagem. Sem valor, são as pessoas da conta. */
  readonly scope?: 'members' | 'customDoses';
}

/** Limite de uso do assistente atingido (ADR-010). */
export interface RateLimitedError {
  readonly code: 'RATE_LIMITED';
  /** O que foi limitado; muda só a mensagem. Sem valor, é o assistente. */
  readonly scope?: 'assistant' | 'login' | 'register' | 'reset' | 'units';
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

/** E-mail ou senha incorretos (a mesma resposta para conta inexistente e senha errada). */
export interface InvalidCredentialsError {
  readonly code: 'INVALID_CREDENTIALS';
}

/** Já existe uma conta com esse e-mail. */
export interface EmailAlreadyRegisteredError {
  readonly code: 'EMAIL_ALREADY_REGISTERED';
}

/** Senha comum demais ou igual ao e-mail. */
export interface WeakPasswordError {
  readonly code: 'WEAK_PASSWORD';
}

/** Token de renovação inválido, expirado ou já usado. */
export interface InvalidTokenError {
  readonly code: 'INVALID_TOKEN';
}

/** Link de redefinição de senha inválido, vencido ou já usado. */
export interface InvalidResetTokenError {
  readonly code: 'INVALID_RESET_TOKEN';
}

/** O login não está configurado neste ambiente (falta a chave de assinatura). */
export interface AuthUnavailableError {
  readonly code: 'AUTH_UNAVAILABLE';
}

/** Erros de domínio dos casos de uso, mapeados para HTTP em um único ponto. */
export type ServiceError =
  | NotFoundError
  | ConsentRequiredError
  | GuardianDeclarationRequiredError
  | InvalidBirthDateError
  | InvalidDoseDateError
  | LimitReachedError
  | RateLimitedError
  | AssistantUnavailableError
  | SpeechNotRecognizedError
  | UnsupportedAudioError
  | AudioTooLargeError
  | InvalidCredentialsError
  | EmailAlreadyRegisteredError
  | WeakPasswordError
  | InvalidTokenError
  | InvalidResetTokenError
  | AuthUnavailableError
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
