import { SPEECH_SAMPLE_RATE, encodeWav, mixToMono, resample, toSpeechWav } from './wav';

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

describe('áudio para o reconhecimento de fala', () => {
  test('CT-WAV-01: o WAV tem cabeçalho PCM, mono, 16 kHz e 16 bits', () => {
    const wav = encodeWav(new Float32Array([0, 0.5, -0.5, 1]));
    const view = new DataView(wav.buffer);
    expect(ascii(wav, 0, 4)).toBe('RIFF');
    expect(ascii(wav, 8, 4)).toBe('WAVE');
    expect(ascii(wav, 12, 4)).toBe('fmt ');
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(SPEECH_SAMPLE_RATE);
    expect(view.getUint32(28, true)).toBe(SPEECH_SAMPLE_RATE * 2);
    expect(view.getUint16(34, true)).toBe(16);
    expect(ascii(wav, 36, 4)).toBe('data');
    expect(view.getUint32(40, true)).toBe(8);
    expect(view.getUint32(4, true)).toBe(wav.length - 8);
    expect(wav.length).toBe(44 + 8);
  });

  test('CT-WAV-02: converte as amostras para inteiros de 16 bits e limita os extremos', () => {
    const wav = encodeWav(new Float32Array([0, 0.5, -0.5, 1, -1, 2, -2]));
    const view = new DataView(wav.buffer);
    const lidas = Array.from({ length: 7 }, (_, i) => view.getInt16(44 + i * 2, true));
    expect(lidas).toEqual([0, 16383, -16384, 32767, -32768, 32767, -32768]);
  });

  test('CT-WAV-03: áudio vazio gera só o cabeçalho', () => {
    expect(encodeWav(new Float32Array(0)).length).toBe(44);
  });

  test('CT-WAV-04: mono fica como está; estéreo vira a média dos canais', () => {
    const esquerdo = new Float32Array([1, 0.5, 0]);
    expect(mixToMono([esquerdo])).toBe(esquerdo);
    expect(Array.from(mixToMono([esquerdo, new Float32Array([0, 0.5, 1])]))).toEqual([
      0.5, 0.5, 0.5,
    ]);
    expect(mixToMono([]).length).toBe(0);
  });

  test('CT-WAV-05: reduzir a taxa faz a média das amostras cobertas e mantém a duração', () => {
    const origem = new Float32Array(48000).fill(0.25);
    const reduzido = resample(origem, 48000, 16000);
    expect(reduzido.length).toBe(16000);
    expect(reduzido[0]).toBeCloseTo(0.25);
    const medias = resample(new Float32Array([0.3, 0.6, 0.9, 1, 0, -1]), 48000, 16000);
    expect(Array.from(medias, (v) => Number(v.toFixed(4)))).toEqual([0.6, 0]);
  });

  test('CT-WAV-06: aumentar a taxa interpola e taxas iguais não mudam nada', () => {
    const origem = new Float32Array([0, 1]);
    expect(Array.from(resample(origem, 8000, 16000))).toEqual([0, 0.5, 1, 1]);
    expect(resample(origem, 16000, 16000)).toBe(origem);
    expect(resample(new Float32Array(0), 48000, 16000).length).toBe(0);
  });

  test('CT-WAV-07: toSpeechWav entrega 1 s de áudio como 16 000 amostras de 16 bits', () => {
    const umSegundo = new Float32Array(44100).fill(0.1);
    const wav = toSpeechWav([umSegundo, umSegundo], 44100);
    expect(wav.length).toBe(44 + 16000 * 2);
    expect(new DataView(wav.buffer).getUint32(24, true)).toBe(16000);
  });
});
