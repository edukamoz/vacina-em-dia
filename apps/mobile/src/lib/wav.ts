/** Taxa de amostragem exigida pelo reconhecimento de fala (WAV PCM, 16 kHz, mono). */
export const SPEECH_SAMPLE_RATE = 16000;

/**
 * Junta vários canais de áudio em um só (média), como pede o reconhecimento de fala (mono).
 *
 * @param channels - Um array de amostras por canal, todos do mesmo tamanho.
 * @returns O áudio mono; vazio se não houver canais.
 */
export function mixToMono(channels: readonly Float32Array[]): Float32Array {
  const first = channels[0];
  if (!first) return new Float32Array(0);
  if (channels.length === 1) return first;
  const mono = new Float32Array(first.length);
  for (const channel of channels) {
    for (let i = 0; i < mono.length; i += 1) mono[i] = (mono[i] ?? 0) + (channel[i] ?? 0);
  }
  for (let i = 0; i < mono.length; i += 1) mono[i] = (mono[i] ?? 0) / channels.length;
  return mono;
}

/**
 * Converte a taxa de amostragem. Ao reduzir (por exemplo, de 48 kHz para 16 kHz), cada amostra nova
 * é a média das antigas que ela cobre, o que evita o chiado de "serrilhado" (aliasing) e basta para
 * voz. Ao aumentar, usa interpolação linear.
 *
 * @param samples - Amostras originais (de -1 a 1).
 * @param fromRate - Taxa original, em Hz.
 * @param toRate - Taxa desejada, em Hz.
 */
export function resample(samples: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate || samples.length === 0) return samples;
  const ratio = fromRate / toRate;
  const length = Math.max(1, Math.floor(samples.length / ratio));
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    if (ratio > 1) {
      const start = Math.floor(i * ratio);
      const end = Math.min(samples.length, Math.max(start + 1, Math.floor((i + 1) * ratio)));
      let sum = 0;
      for (let j = start; j < end; j += 1) sum += samples[j] ?? 0;
      out[i] = sum / (end - start);
    } else {
      const position = i * ratio;
      const index = Math.floor(position);
      const fraction = position - index;
      const a = samples[index] ?? 0;
      const b = samples[Math.min(index + 1, samples.length - 1)] ?? a;
      out[i] = a + (b - a) * fraction;
    }
  }
  return out;
}

/**
 * Codifica amostras (de -1 a 1) como arquivo WAV PCM de 16 bits, mono, com cabeçalho de 44 bytes.
 *
 * @param samples - Amostras mono.
 * @param sampleRate - Taxa de amostragem das amostras; por padrão 16 kHz.
 */
export function encodeWav(
  samples: Float32Array,
  sampleRate: number = SPEECH_SAMPLE_RATE,
): Uint8Array {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true); // tamanho do bloco fmt
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // bytes por segundo
  view.setUint16(32, 2, true); // bytes por amostra
  view.setUint16(34, 16, true); // bits por amostra
  text(36, 'data');
  view.setUint32(40, dataBytes, true);
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  return new Uint8Array(buffer);
}

/**
 * Prepara o áudio gravado para o reconhecimento de fala: mono, 16 kHz, WAV PCM.
 *
 * @param channels - Canais decodificados do áudio gravado.
 * @param sampleRate - Taxa de amostragem original.
 */
export function toSpeechWav(channels: readonly Float32Array[], sampleRate: number): Uint8Array {
  return encodeWav(resample(mixToMono(channels), sampleRate, SPEECH_SAMPLE_RATE));
}
