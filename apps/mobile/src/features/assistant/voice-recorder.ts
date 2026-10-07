import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioStream } from 'expo-audio';
import { useMemo, useRef } from 'react';
import { joinPcm, type PcmBuffer } from '../../lib/pcm';
import { SPEECH_SAMPLE_RATE, toSpeechWav } from '../../lib/wav';
import { VoiceError, type VoiceRecorder } from './voice-types';

/** Duração mínima, em segundos, para considerar que houve fala. */
export const MIN_RECORDING_SECONDS = 0.3;

/** No celular, a gravação sempre está disponível (o microfone é pedido ao tocar em Falar). */
export function isVoiceSupported(): boolean {
  return true;
}

/**
 * Gravador de voz para Android e iOS: captura o microfone em PCM com o `AudioStream` do
 * `expo-audio` e monta o WAV de 16 kHz, mono, que o reconhecimento de fala aceita, no próprio
 * aparelho. Assim a API é a mesma da web: nada é gravado em arquivo, e o áudio só sai do aparelho
 * rumo à API, que o descarta depois de transcrever.
 *
 * É um hook porque o módulo de áudio entrega o microfone por um objeto ligado ao componente.
 */
export function useVoiceRecorder(): VoiceRecorder {
  const buffers = useRef<PcmBuffer[]>([]);
  const { stream } = useAudioStream({
    sampleRate: SPEECH_SAMPLE_RATE,
    channels: 1,
    encoding: 'float32',
    onBuffer: (buffer) => {
      buffers.current.push({
        samples: new Float32Array(buffer.data.slice(0)),
        sampleRate: buffer.sampleRate,
        channels: buffer.channels,
      });
    },
  });

  return useMemo<VoiceRecorder>(() => {
    const release = async () => {
      try {
        stream.stop();
      } catch {
        // O microfone já estava solto.
      }
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    };

    return {
      async start() {
        let permission;
        try {
          permission = await requestRecordingPermissionsAsync();
        } catch {
          throw new VoiceError('FAILED');
        }
        if (!permission.granted) throw new VoiceError('PERMISSION_DENIED');
        buffers.current = [];
        try {
          // No iOS, o microfone só abre com a sessão de áudio em modo de gravação.
          await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
          await stream.start();
        } catch {
          await release();
          throw new VoiceError('NO_MICROPHONE');
        }
      },

      async stop() {
        await release();
        const recorded = joinPcm(buffers.current);
        buffers.current = [];
        if (!recorded || recorded.seconds < MIN_RECORDING_SECONDS) {
          throw new VoiceError('EMPTY_RECORDING');
        }
        return toSpeechWav(recorded.channels, recorded.sampleRate);
      },

      cancel() {
        buffers.current = [];
        void release();
      },
    };
  }, [stream]);
}
