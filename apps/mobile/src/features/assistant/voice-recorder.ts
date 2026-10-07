import { VoiceError, type VoiceRecorder } from './voice-types';

/**
 * Versão para Android e iOS. A gravação por voz está disponível na web; no celular ela entra
 * quando o módulo de áudio do Expo for validado em aparelho real (documentado em
 * `docs/11-assistente-pln.md`). Enquanto isso, o app mostra só o campo de texto.
 */
export function isVoiceSupported(): boolean {
  return false;
}

/** Cria o gravador de voz. No celular, ainda não existe: usar {@link isVoiceSupported} antes. */
export function createVoiceRecorder(): VoiceRecorder {
  const unsupported = () => Promise.reject(new VoiceError('UNSUPPORTED'));
  return {
    start: unsupported,
    stop: unsupported,
    cancel: () => undefined,
  };
}
