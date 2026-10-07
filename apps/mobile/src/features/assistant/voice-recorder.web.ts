import { useMemo, useRef } from 'react';
import { toSpeechWav } from '../../lib/wav';
import { VoiceError, type VoiceRecorder } from './voice-types';

interface BrowserGlobals {
  navigator?: {
    mediaDevices?: { getUserMedia?: (c: MediaStreamConstraints) => Promise<MediaStream> };
  };
  MediaRecorder?: typeof MediaRecorder;
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

const browser = (): BrowserGlobals => globalThis as unknown as BrowserGlobals;

/** Indica se o navegador consegue gravar áudio (exige conexão segura, https ou localhost). */
export function isVoiceSupported(): boolean {
  const g = browser();
  return Boolean(
    g.navigator?.mediaDevices?.getUserMedia &&
    g.MediaRecorder &&
    (g.AudioContext ?? g.webkitAudioContext),
  );
}

function releaseMicrophone(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

/**
 * Gravador de voz para a web: grava com `MediaRecorder`, decodifica com `AudioContext` e converte
 * para WAV PCM de 16 kHz, mono, que é o que o reconhecimento de fala aceita (o navegador grava em
 * WebM ou MP4, que a API de fala curta não lê). Tudo acontece no aparelho; o áudio só sai dele
 * rumo à API, que o descarta depois de transcrever.
 */
export function createVoiceRecorder(): VoiceRecorder {
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];

  return {
    async start() {
      const g = browser();
      if (!isVoiceSupported() || !g.MediaRecorder) throw new VoiceError('UNSUPPORTED');
      try {
        stream = (await g.navigator?.mediaDevices?.getUserMedia?.({ audio: true })) ?? null;
      } catch (error) {
        const name = (error as { name?: string }).name;
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          throw new VoiceError('PERMISSION_DENIED');
        }
        if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          throw new VoiceError('NO_MICROPHONE');
        }
        throw new VoiceError('FAILED');
      }
      if (!stream) throw new VoiceError('NO_MICROPHONE');
      chunks = [];
      recorder = new g.MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.start();
    },

    async stop() {
      const active = recorder;
      if (!active) throw new VoiceError('FAILED');
      const finished = new Promise<void>((resolve) => {
        active.onstop = () => resolve();
      });
      if (active.state !== 'inactive') active.stop();
      await finished;
      releaseMicrophone(stream);
      stream = null;
      recorder = null;

      if (chunks.length === 0) throw new VoiceError('EMPTY_RECORDING');
      const recorded = new Blob(chunks, { type: active.mimeType });
      chunks = [];
      if (recorded.size === 0) throw new VoiceError('EMPTY_RECORDING');

      const g = browser();
      const Context = g.AudioContext ?? g.webkitAudioContext;
      if (!Context) throw new VoiceError('UNSUPPORTED');
      const context = new Context();
      try {
        const decoded = await context.decodeAudioData(await recorded.arrayBuffer());
        const channels = Array.from({ length: decoded.numberOfChannels }, (_, i) =>
          decoded.getChannelData(i),
        );
        return toSpeechWav(channels, decoded.sampleRate);
      } catch {
        throw new VoiceError('FAILED');
      } finally {
        void context.close();
      }
    },

    cancel() {
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null;
        recorder.stop();
      }
      releaseMicrophone(stream);
      stream = null;
      recorder = null;
      chunks = [];
    },
  };
}

/**
 * Gravador para a tela do assistente: na web, cada gravação usa um {@link createVoiceRecorder}
 * novo. Tem o mesmo formato do gancho do celular (`voice-recorder.ts`), que precisa ser um hook.
 */
export function useVoiceRecorder(): VoiceRecorder {
  const current = useRef<VoiceRecorder | null>(null);
  return useMemo<VoiceRecorder>(
    () => ({
      async start() {
        current.current?.cancel();
        current.current = createVoiceRecorder();
        await current.current.start();
      },
      async stop() {
        const active = current.current;
        if (!active) throw new VoiceError('FAILED');
        return active.stop();
      },
      cancel() {
        current.current?.cancel();
        current.current = null;
      },
    }),
    [],
  );
}
