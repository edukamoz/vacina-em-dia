/** Um bloco de áudio PCM (float de -1 a 1) entregue pelo microfone do celular. */
export interface PcmBuffer {
  /** Amostras, intercaladas entre os canais ([E, D, E, D...] quando estéreo). */
  readonly samples: Float32Array;
  /** Taxa de amostragem real, em Hz (pode diferir da pedida). */
  readonly sampleRate: number;
  /** Quantidade de canais. */
  readonly channels: number;
}

/** Áudio gravado, separado por canal, pronto para virar WAV. */
export interface RecordedPcm {
  readonly channels: Float32Array[];
  readonly sampleRate: number;
  readonly seconds: number;
}

/**
 * Junta os blocos recebidos do microfone em um áudio por canal. Os blocos vêm intercalados
 * (estéreo: E, D, E, D...); aqui eles são separados e emendados na ordem em que chegaram.
 *
 * @param buffers - Blocos na ordem de chegada.
 * @returns O áudio, ou `null` se não chegou nenhuma amostra.
 */
export function joinPcm(buffers: readonly PcmBuffer[]): RecordedPcm | null {
  const first = buffers[0];
  if (!first) return null;
  const { sampleRate, channels } = first;
  const frames = buffers.reduce(
    (total, buffer) => total + Math.floor(buffer.samples.length / buffer.channels),
    0,
  );
  if (frames === 0) return null;
  const joined = Array.from({ length: channels }, () => new Float32Array(frames));
  let offset = 0;
  for (const buffer of buffers) {
    const length = Math.floor(buffer.samples.length / buffer.channels);
    for (let channel = 0; channel < channels; channel += 1) {
      const target = joined[channel];
      if (!target) continue;
      // Um bloco com menos canais do que o primeiro repete o último canal que tem.
      const source = Math.min(channel, buffer.channels - 1);
      for (let i = 0; i < length; i += 1) {
        target[offset + i] = buffer.samples[i * buffer.channels + source] ?? 0;
      }
    }
    offset += length;
  }
  return { channels: joined, sampleRate, seconds: frames / sampleRate };
}
