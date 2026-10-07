/** Motivos pelos quais a gravação por voz não funcionou. */
export type VoiceErrorKind =
  'UNSUPPORTED' | 'PERMISSION_DENIED' | 'NO_MICROPHONE' | 'EMPTY_RECORDING' | 'FAILED';

const MESSAGES: Readonly<Record<VoiceErrorKind, string>> = {
  UNSUPPORTED:
    'A pergunta por voz ainda não está disponível neste aparelho. Digite a sua pergunta.',
  PERMISSION_DENIED:
    'Para falar, permita o uso do microfone nas configurações do navegador. Se preferir, digite a sua pergunta.',
  NO_MICROPHONE: 'Não encontramos um microfone. Digite a sua pergunta.',
  EMPTY_RECORDING: 'Não ouvimos nada. Toque em Falar e tente de novo, ou digite a sua pergunta.',
  FAILED: 'Não foi possível gravar o áudio. Tente de novo ou digite a sua pergunta.',
};

/** Erro de gravação por voz, com mensagem em linguagem simples para mostrar ao usuário. */
export class VoiceError extends Error {
  constructor(readonly kind: VoiceErrorKind) {
    super(MESSAGES[kind]);
    this.name = 'VoiceError';
  }
}

/** Gravador de voz: grava, e ao parar entrega o áudio pronto (WAV PCM 16 kHz, mono). */
export interface VoiceRecorder {
  /** Pede o microfone e começa a gravar. */
  start(): Promise<void>;
  /** Para a gravação e devolve o áudio em WAV PCM de 16 kHz, mono. */
  stop(): Promise<Uint8Array>;
  /** Descarta a gravação e solta o microfone. */
  cancel(): void;
}

/** Duração máxima de uma gravação, em segundos (a API aceita até 60). */
export const MAX_RECORDING_SECONDS = 30;
