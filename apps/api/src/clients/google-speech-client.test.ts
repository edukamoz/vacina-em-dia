import { UpstreamError } from '../services/assistant-ports';
import { createInMemoryFileStorage } from '../storage/file-storage';
import {
  createGoogleSpeechClient,
  createMetadataTokenProvider,
  createMonthlyVoiceBudget,
  DEFAULT_VOICE_MONTHLY_SECONDS,
  wavSeconds,
} from './google-speech-client';

function respond(status: number, body?: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) throw new Error('sem corpo');
      return body;
    },
  }) as unknown as jest.MockedFunction<typeof fetch>;
}

/** WAV de teste: cabeçalho de 44 bytes mais `seconds` segundos de PCM 16 kHz, 16 bits, mono. */
function wav(seconds: number): Uint8Array {
  return new Uint8Array(44 + seconds * 32000);
}

const livre = { reserve: async () => true };

describe('duração e contador mensal da voz (Google)', () => {
  test.each([
    [44, 1],
    [44 + 16000, 1],
    [44 + 32000, 1],
    [44 + 32001, 2],
    [44 + 60 * 32000, 60],
  ])(
    'CT-VOZ-01: %i bytes de WAV contam %i segundo(s), arredondando para cima',
    (bytes, esperado) => {
      expect(wavSeconds(new Uint8Array(bytes))).toBe(esperado);
    },
  );

  test('CT-VOZ-02: o teto padrão é de 50 minutos, abaixo dos 60 gratuitos', () => {
    expect(DEFAULT_VOICE_MONTHLY_SECONDS).toBe(3000);
  });

  test('CT-VOZ-03: reserva até o teto, recusa o que passa e não reserva nada ao recusar', async () => {
    const budget = createMonthlyVoiceBudget({
      storage: createInMemoryFileStorage(),
      clock: () => '2026-11-18T10:00:00.000Z',
      limitSeconds: 100,
    });
    expect(await budget.reserve(60)).toBe(true);
    expect(await budget.reserve(41)).toBe(false);
    expect(await budget.reserve(40)).toBe(true);
    expect(await budget.reserve(1)).toBe(false);
  });

  test('CT-VOZ-04: o contador zera na virada do mês', async () => {
    let agora = '2026-11-30T23:59:00.000Z';
    const budget = createMonthlyVoiceBudget({
      storage: createInMemoryFileStorage(),
      clock: () => agora,
      limitSeconds: 10,
    });
    expect(await budget.reserve(10)).toBe(true);
    expect(await budget.reserve(1)).toBe(false);
    agora = '2026-12-01T00:00:00.000Z';
    expect(await budget.reserve(10)).toBe(true);
  });

  test('CT-VOZ-05: guarda só um número, sem áudio', async () => {
    const storage = createInMemoryFileStorage();
    const budget = createMonthlyVoiceBudget({
      storage,
      clock: () => '2026-11-18T10:00:00.000Z',
      limitSeconds: 100,
    });
    await budget.reserve(7);
    const arquivo = await storage.get('2026-11');
    expect(new TextDecoder().decode(arquivo?.bytes)).toBe('7');
    expect(arquivo?.contentType).toBe('text/plain');
  });

  test('CT-VOZ-06: contador corrompido é tratado como zero', async () => {
    const storage = createInMemoryFileStorage();
    await storage.put('2026-11', {
      bytes: new TextEncoder().encode('lixo'),
      contentType: 'text/plain',
    });
    const budget = createMonthlyVoiceBudget({
      storage,
      clock: () => '2026-11-18T10:00:00.000Z',
      limitSeconds: 100,
    });
    expect(await budget.reserve(5)).toBe(true);
  });
});

describe('token da conta de serviço (metadados)', () => {
  const TOKEN = { access_token: 'tok', expires_in: 3600 };

  test('CT-VOZ-07: pede o token com o cabeçalho do Google e o reaproveita até perto de vencer', async () => {
    const fetchFn = respond(200, TOKEN);
    let agora = 0;
    const getToken = createMetadataTokenProvider(fetchFn, () => agora);
    expect(await getToken()).toBe('tok');
    agora = 3000 * 1000;
    expect(await getToken()).toBe('tok');
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(
      expect.stringContaining('metadata.google.internal'),
      expect.objectContaining({ headers: { 'Metadata-Flavor': 'Google' } }),
    );
    agora = 3541 * 1000;
    await getToken();
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  test.each([
    ['falha de rede', jest.fn().mockRejectedValue(new TypeError('rede'))],
    ['HTTP 404', respond(404)],
    ['corpo fora do contrato', respond(200, { access_token: '' })],
    ['corpo que não é JSON', respond(200)],
  ])('CT-VOZ-08: %s vira UpstreamError', async (_nome, fetchFn) => {
    const getToken = createMetadataTokenProvider(fetchFn as unknown as typeof fetch);
    await expect(getToken()).rejects.toBeInstanceOf(UpstreamError);
  });
});

describe('cliente de fala do Google', () => {
  const config = (fetchFn: typeof fetch, budget = livre) => ({
    getToken: async () => 'tok',
    budget,
    fetchFn,
  });

  test('CT-VOZ-09: envia o PCM em base64 com o token e devolve o texto', async () => {
    const fetchFn = respond(200, {
      results: [{ alternatives: [{ transcript: ' quando tomar a BCG ' }] }],
    });
    const result = await createGoogleSpeechClient(config(fetchFn)).transcribe(wav(2));
    expect(result).toEqual({ ok: true, text: 'quando tomar a BCG' });
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://speech.googleapis.com/v1/speech:recognize');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok');
    const body = JSON.parse(init.body as string) as {
      config: { languageCode: string; encoding: string; sampleRateHertz: number };
      audio: { content: string };
    };
    expect(body.config).toMatchObject({
      languageCode: 'pt-BR',
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
    });
    expect(Buffer.from(body.audio.content, 'base64').length).toBe(2 * 32000);
  });

  test('CT-VOZ-10: junta os trechos reconhecidos', async () => {
    const fetchFn = respond(200, {
      results: [
        { alternatives: [{ transcript: 'oi' }] },
        { alternatives: [{ transcript: 'tudo bem' }] },
      ],
    });
    expect(await createGoogleSpeechClient(config(fetchFn)).transcribe(wav(1))).toEqual({
      ok: true,
      text: 'oi tudo bem',
    });
  });

  test.each([[{}], [{ results: [] }], [{ results: [{ alternatives: [{ transcript: '  ' }] }] }]])(
    'CT-VOZ-11: resposta sem texto (%j) é fala não reconhecida',
    async (corpo) => {
      const fetchFn = respond(200, corpo);
      expect(await createGoogleSpeechClient(config(fetchFn)).transcribe(wav(1))).toEqual({
        ok: false,
        reason: 'NOT_RECOGNIZED',
      });
    },
  );

  test.each([
    ['falha de rede', jest.fn().mockRejectedValue(new TypeError('rede'))],
    ['HTTP 403', respond(403, { error: 'x' })],
    ['HTTP 429', respond(429)],
    ['HTTP 500', respond(500)],
    ['resposta fora do contrato', respond(200, { results: 'x' })],
    ['corpo que não é JSON', respond(200)],
  ])('CT-VOZ-12: %s vira UpstreamError sem detalhe', async (_nome, fetchFn) => {
    const error = await createGoogleSpeechClient(config(fetchFn as unknown as typeof fetch))
      .transcribe(wav(1))
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as Error).message).not.toMatch(/rede|403|tok/);
  });

  test('CT-VOZ-13: sem saldo no mês, nem chama o Google', async () => {
    const fetchFn = respond(200, {});
    const semSaldo = { reserve: async () => false };
    await expect(
      createGoogleSpeechClient(config(fetchFn, semSaldo)).transcribe(wav(1)),
    ).rejects.toBeInstanceOf(UpstreamError);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  test('CT-VOZ-14: reserva os segundos do áudio antes de chamar', async () => {
    const reserve = jest.fn().mockResolvedValue(true);
    const fetchFn = respond(200, { results: [{ alternatives: [{ transcript: 'oi' }] }] });
    await createGoogleSpeechClient(config(fetchFn, { reserve })).transcribe(wav(3));
    expect(reserve).toHaveBeenCalledWith(3);
  });
});
