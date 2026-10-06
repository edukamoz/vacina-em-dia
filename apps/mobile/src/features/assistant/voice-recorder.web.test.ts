import { createVoiceRecorder, isVoiceSupported } from './voice-recorder.web';
import { VoiceError } from './voice-types';
import * as native from './voice-recorder';

type G = Record<string, unknown>;
const g = globalThis as unknown as G;

class FakeTrack {
  stopped = false;
  stop() {
    this.stopped = true;
  }
}
class FakeStream {
  track = new FakeTrack();
  getTracks() {
    return [this.track];
  }
}
class FakeMediaRecorder {
  state = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  static emit = true;
  static last: FakeMediaRecorder | null = null;
  constructor(readonly stream: FakeStream) {
    FakeMediaRecorder.last = this;
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    if (FakeMediaRecorder.emit)
      this.ondataavailable?.({ data: new Blob([new Uint8Array([1, 2, 3])]) });
    this.onstop?.();
  }
}
class FakeAudioContext {
  static fail = false;
  closed = false;
  decodeAudioData() {
    if (FakeAudioContext.fail) return Promise.reject(new Error('decode'));
    return Promise.resolve({
      numberOfChannels: 2,
      sampleRate: 48000,
      getChannelData: () => new Float32Array(4800).fill(0.1),
    });
  }
  close() {
    this.closed = true;
    return Promise.resolve();
  }
}

let stream: FakeStream;
function installBrowser(getUserMedia?: () => Promise<unknown>) {
  stream = new FakeStream();
  g['navigator'] = {
    mediaDevices: { getUserMedia: getUserMedia ?? (() => Promise.resolve(stream)) },
  };
  g['MediaRecorder'] = FakeMediaRecorder;
  g['AudioContext'] = FakeAudioContext;
}

const original = {
  navigator: g['navigator'],
  MediaRecorder: g['MediaRecorder'],
  AudioContext: g['AudioContext'],
};
afterEach(() => {
  g['navigator'] = original.navigator;
  g['MediaRecorder'] = original.MediaRecorder;
  g['AudioContext'] = original.AudioContext;
  FakeMediaRecorder.emit = true;
  FakeAudioContext.fail = false;
  FakeMediaRecorder.last = null;
});

describe('gravador de voz (web)', () => {
  test('CT-VOZ-01: só é suportado com microfone, gravador e áudio do navegador', () => {
    installBrowser();
    expect(isVoiceSupported()).toBe(true);
    g['MediaRecorder'] = undefined;
    expect(isVoiceSupported()).toBe(false);
    installBrowser();
    g['AudioContext'] = undefined;
    g['webkitAudioContext'] = FakeAudioContext;
    expect(isVoiceSupported()).toBe(true);
    g['webkitAudioContext'] = undefined;
    g['navigator'] = {};
    expect(isVoiceSupported()).toBe(false);
  });

  test('CT-VOZ-02: grava, solta o microfone e devolve um WAV PCM de 16 kHz, mono', async () => {
    installBrowser();
    const recorder = createVoiceRecorder();
    await recorder.start();
    expect(FakeMediaRecorder.last?.state).toBe('recording');
    const wav = await recorder.stop();
    expect(String.fromCharCode(...wav.subarray(0, 4))).toBe('RIFF');
    expect(new DataView(wav.buffer).getUint32(24, true)).toBe(16000);
    expect(wav.length).toBe(44 + 1600 * 2); // 4800 amostras a 48 kHz = 100 ms
    expect(stream.track.stopped).toBe(true);
  });

  test.each([
    ['NotAllowedError', 'PERMISSION_DENIED'],
    ['SecurityError', 'PERMISSION_DENIED'],
    ['NotFoundError', 'NO_MICROPHONE'],
    ['OverconstrainedError', 'NO_MICROPHONE'],
    ['AbortError', 'FAILED'],
  ])('CT-VOZ-03: erro %s do navegador vira %s', async (name, kind) => {
    installBrowser(() => Promise.reject(Object.assign(new Error('x'), { name })));
    await expect(createVoiceRecorder().start()).rejects.toMatchObject({ kind });
  });

  test('CT-VOZ-04: sem suporte, começar falha com UNSUPPORTED', async () => {
    g['navigator'] = {};
    await expect(createVoiceRecorder().start()).rejects.toMatchObject({ kind: 'UNSUPPORTED' });
  });

  test('CT-VOZ-05: parar sem ter começado é falha; sem áudio é gravação vazia', async () => {
    installBrowser();
    await expect(createVoiceRecorder().stop()).rejects.toBeInstanceOf(VoiceError);
    const recorder = createVoiceRecorder();
    await recorder.start();
    FakeMediaRecorder.emit = false;
    await expect(recorder.stop()).rejects.toMatchObject({ kind: 'EMPTY_RECORDING' });
    expect(stream.track.stopped).toBe(true);
  });

  test('CT-VOZ-06: áudio que não decodifica vira FAILED e o contexto de áudio é fechado', async () => {
    installBrowser();
    FakeAudioContext.fail = true;
    const recorder = createVoiceRecorder();
    await recorder.start();
    await expect(recorder.stop()).rejects.toMatchObject({ kind: 'FAILED' });
  });

  test('CT-VOZ-07: cancelar descarta a gravação e solta o microfone', async () => {
    installBrowser();
    const recorder = createVoiceRecorder();
    await recorder.start();
    recorder.cancel();
    expect(FakeMediaRecorder.last?.state).toBe('inactive');
    expect(stream.track.stopped).toBe(true);
    recorder.cancel(); // chamar de novo não quebra
    await expect(recorder.stop()).rejects.toMatchObject({ kind: 'FAILED' });
  });
});

describe('gravador de voz (celular)', () => {
  test('CT-VOZ-10: ainda não suportado, mas os erros são claros e cancelar é seguro', async () => {
    expect(native.isVoiceSupported()).toBe(false);
    const recorder = native.createVoiceRecorder();
    await expect(recorder.start()).rejects.toMatchObject({ kind: 'UNSUPPORTED' });
    await expect(recorder.stop()).rejects.toMatchObject({ kind: 'UNSUPPORTED' });
    expect(recorder.cancel()).toBeUndefined();
  });

  test('CT-VOZ-11: as mensagens de erro estão em linguagem simples e sempre oferecem digitar', () => {
    for (const kind of [
      'UNSUPPORTED',
      'PERMISSION_DENIED',
      'NO_MICROPHONE',
      'EMPTY_RECORDING',
      'FAILED',
    ] as const) {
      expect(new VoiceError(kind).message).toMatch(/digit/i);
    }
  });
});
