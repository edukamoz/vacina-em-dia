import { act, render } from '@testing-library/react-native';
import { joinPcm } from '../../lib/pcm';
import { isVoiceSupported, MIN_RECORDING_SECONDS, useVoiceRecorder } from './voice-recorder';
import type { VoiceRecorder } from './voice-types';

const mockStart = jest.fn();
const mockStop = jest.fn();
const mockPermission = jest.fn();
const mockMode = jest.fn();
let mockOnBuffer: ((buffer: unknown) => void) | undefined;

jest.mock('expo-audio', () => ({
  requestRecordingPermissionsAsync: () => mockPermission(),
  setAudioModeAsync: (mode: unknown) => mockMode(mode),
  useAudioStream: (options: { onBuffer: (buffer: unknown) => void }) => {
    mockOnBuffer = options.onBuffer;
    return { stream: { start: mockStart, stop: mockStop }, isStreaming: false };
  },
}));

/** Bloco de microfone de teste: `frames` amostras com valor `value`, em `rate` Hz. */
function block(frames: number, rate = 16000, value = 0.25, channels = 1) {
  const samples = new Float32Array(frames * channels).fill(value);
  return { data: samples.buffer, sampleRate: rate, channels, timestamp: 0 };
}

/** Monta um componente de teste que usa o gancho e devolve o gravador. */
async function mountRecorder() {
  const result: { current: VoiceRecorder } = { current: undefined as unknown as VoiceRecorder };
  function Harness() {
    result.current = useVoiceRecorder();
    return null;
  }
  await render(<Harness />);
  await act(async () => undefined);
  return { result };
}

/** Para a gravação dentro de `act`, sem devolver valor ao `act` (ele só aceita retorno vazio). */
async function stopAndCollect(recorder: VoiceRecorder): Promise<Uint8Array> {
  let wav: Uint8Array = new Uint8Array(0);
  await act(async () => {
    wav = await recorder.stop();
  });
  return wav;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPermission.mockResolvedValue({ granted: true });
  mockStart.mockResolvedValue(undefined);
  mockMode.mockResolvedValue(undefined);
  mockOnBuffer = undefined;
});

describe('gravador de voz do celular (RF06)', () => {
  test('CT-VOZ-20: no celular a voz está disponível', () => {
    expect(isVoiceSupported()).toBe(true);
  });

  test('CT-VOZ-21: pede o microfone, grava e entrega um WAV de 16 kHz, mono', async () => {
    const { result } = await mountRecorder();
    await act(async () => {
      await result.current.start();
    });
    expect(mockMode).toHaveBeenCalledWith({ allowsRecording: true, playsInSilentMode: true });
    expect(mockStart).toHaveBeenCalledTimes(1);

    await act(() => {
      mockOnBuffer?.(block(8000));
      mockOnBuffer?.(block(8000));
    });
    const wav = await stopAndCollect(result.current);
    expect(mockStop).toHaveBeenCalled();
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...wav.slice(8, 12))).toBe('WAVE');
    // 1 s a 16 kHz, 16 bits: 32000 bytes de áudio mais o cabeçalho de 44.
    expect(wav.length).toBe(44 + 32000);
  });

  test('CT-VOZ-22: áudio em 48 kHz é convertido para 16 kHz', async () => {
    const { result } = await mountRecorder();
    await act(async () => {
      await result.current.start();
    });
    await act(() => {
      mockOnBuffer?.(block(48000, 48000));
    });
    const wav = await stopAndCollect(result.current);
    expect(wav.length).toBe(44 + 32000);
  });

  test('CT-VOZ-23: microfone negado vira PERMISSION_DENIED e não abre a captura', async () => {
    mockPermission.mockResolvedValue({ granted: false });
    const { result } = await mountRecorder();
    await expect(result.current.start()).rejects.toMatchObject({ kind: 'PERMISSION_DENIED' });
    expect(mockStart).not.toHaveBeenCalled();
  });

  test('CT-VOZ-24: falha ao pedir a permissão ou ao abrir o microfone dá erro claro e solta tudo', async () => {
    mockPermission.mockRejectedValue(new Error('nativo'));
    const { result } = await mountRecorder();
    await expect(result.current.start()).rejects.toMatchObject({ kind: 'FAILED' });

    mockPermission.mockResolvedValue({ granted: true });
    mockStart.mockRejectedValue(new Error('sem microfone'));
    await expect(result.current.start()).rejects.toMatchObject({ kind: 'NO_MICROPHONE' });
    expect(mockStop).toHaveBeenCalled();
    expect(mockMode).toHaveBeenLastCalledWith({ allowsRecording: false });
  });

  test.each([
    ['nada gravado', [] as number[]],
    ['gravação curta demais', [Math.floor(16000 * (MIN_RECORDING_SECONDS - 0.1))]],
  ])('CT-VOZ-25: %s vira EMPTY_RECORDING', async (_nome, frames) => {
    const { result } = await mountRecorder();
    await act(async () => {
      await result.current.start();
    });
    await act(() => {
      for (const n of frames) mockOnBuffer?.(block(n));
    });
    await expect(result.current.stop()).rejects.toMatchObject({ kind: 'EMPTY_RECORDING' });
  });

  test('CT-VOZ-26: cancelar descarta o áudio e solta o microfone', async () => {
    const { result } = await mountRecorder();
    await act(async () => {
      await result.current.start();
    });
    await act(() => {
      mockOnBuffer?.(block(16000));
    });
    await act(() => result.current.cancel());
    expect(mockStop).toHaveBeenCalled();
    await expect(result.current.stop()).rejects.toMatchObject({ kind: 'EMPTY_RECORDING' });
  });

  test('CT-VOZ-27: parar com o microfone já solto não quebra', async () => {
    mockStop.mockImplementation(() => {
      throw new Error('já parado');
    });
    const { result } = await mountRecorder();
    await act(async () => {
      await result.current.start();
    });
    await act(() => {
      mockOnBuffer?.(block(16000));
    });
    await expect(result.current.stop()).resolves.toBeInstanceOf(Uint8Array);
  });
});

describe('junção dos blocos de áudio', () => {
  test('CT-VOZ-30: sem blocos ou só com blocos vazios, não há áudio', () => {
    expect(joinPcm([])).toBeNull();
    expect(joinPcm([{ samples: new Float32Array(0), sampleRate: 16000, channels: 1 }])).toBeNull();
  });

  test('CT-VOZ-31: estéreo intercalado é separado por canal e emendado na ordem', () => {
    const joined = joinPcm([
      { samples: new Float32Array([1, -1, 2, -2]), sampleRate: 8000, channels: 2 },
      { samples: new Float32Array([3, -3]), sampleRate: 8000, channels: 2 },
    ]);
    expect(joined?.channels.map((c) => Array.from(c))).toEqual([
      [1, 2, 3],
      [-1, -2, -3],
    ]);
    expect(joined?.seconds).toBeCloseTo(3 / 8000);
  });

  test('CT-VOZ-32: bloco mono no meio de uma gravação estéreo repete o canal que tem', () => {
    const joined = joinPcm([
      { samples: new Float32Array([1, -1]), sampleRate: 8000, channels: 2 },
      { samples: new Float32Array([5]), sampleRate: 8000, channels: 1 },
    ]);
    expect(joined?.channels.map((c) => Array.from(c))).toEqual([
      [1, 5],
      [-1, 5],
    ]);
  });
});
