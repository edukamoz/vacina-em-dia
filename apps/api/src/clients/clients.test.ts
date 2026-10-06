import { UpstreamError } from '../services/assistant-ports';
import { createHttpNlpClient, unavailableNlpClient } from './nlp-http-client';
import { createHttpSpeechClient, unavailableSpeechClient } from './speech-http-client';

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

const REPLY = {
  intent: 'saudacao',
  text: 'Olá!',
  confidence: 0.9,
  source: { name: 'Ajuda do Vacina em Dia' },
  suggestions: [],
  fallback: false,
  safety: false,
};
const SEARCH = {
  results: [],
  source: { name: 'Calendário', version: '2026' },
  notice: 'aviso',
};

describe('cliente do serviço de PLN', () => {
  const config = (fetchFn: typeof fetch) => ({
    baseUrl: 'https://nlp.test/api/',
    functionKey: 'chave-de-teste',
    fetchFn,
  });

  test('CT-CLI-01: envia a pergunta com a chave da função e valida a resposta', async () => {
    const fetchFn = respond(200, REPLY);
    const reply = await createHttpNlpClient(config(fetchFn)).chat('oi');
    expect(reply.intent).toBe('saudacao');
    expect(fetchFn).toHaveBeenCalledWith(
      'https://nlp.test/api/chat',
      expect.objectContaining({
        method: 'POST',
        body: '{"text":"oi"}',
        headers: expect.objectContaining({ 'x-functions-key': 'chave-de-teste' }),
      }),
    );
  });

  test('CT-CLI-02: a busca usa a rota /search', async () => {
    const fetchFn = respond(200, SEARCH);
    expect((await createHttpNlpClient(config(fetchFn)).search('bcg')).results).toEqual([]);
    expect(fetchFn.mock.calls[0]?.[0]).toBe('https://nlp.test/api/search');
  });

  test.each([
    ['falha de rede', jest.fn().mockRejectedValue(new TypeError('rede'))],
    ['HTTP 500', respond(500, { code: 'x' })],
    ['HTTP 401', respond(401)],
    ['resposta fora do contrato', respond(200, { intent: 1 })],
    ['corpo que não é JSON', respond(200)],
  ])('CT-CLI-03: %s vira UpstreamError sem detalhe', async (_nome, fetchFn) => {
    const error = await createHttpNlpClient(config(fetchFn as unknown as typeof fetch))
      .chat('pergunta com dado pessoal')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as Error).message).not.toMatch(/pergunta|chave|rede/);
  });

  test('CT-CLI-04: sem configuração, o cliente falha com segurança', async () => {
    await expect(unavailableNlpClient.chat('oi')).rejects.toBeInstanceOf(UpstreamError);
    await expect(unavailableNlpClient.search('oi')).rejects.toBeInstanceOf(UpstreamError);
  });
});

describe('cliente de reconhecimento de fala', () => {
  const config = (fetchFn: typeof fetch) => ({
    endpoint: 'https://spch.cognitiveservices.azure.com/',
    key: 'chave-de-voz',
    fetchFn,
  });
  const audio = new Uint8Array([1, 2, 3]);

  test('CT-CLI-10: envia o WAV ao endpoint do Speech em pt-BR e devolve o texto', async () => {
    const fetchFn = respond(200, {
      RecognitionStatus: 'Success',
      DisplayText: ' Para que serve a BCG? ',
    });
    const result = await createHttpSpeechClient(config(fetchFn)).transcribe(audio);
    expect(result).toEqual({ ok: true, text: 'Para que serve a BCG?' });
    expect(fetchFn).toHaveBeenCalledWith(
      'https://spch.cognitiveservices.azure.com/stt/speech/recognition/conversation/cognitiveservices/v1?language=pt-BR&format=simple',
      expect.objectContaining({
        method: 'POST',
        body: audio,
        headers: expect.objectContaining({
          'Ocp-Apim-Subscription-Key': 'chave-de-voz',
          'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        }),
      }),
    );
  });

  test.each(['NoMatch', 'InitialSilenceTimeout', 'BabbleTimeout'])(
    'CT-CLI-11: status %s significa fala não reconhecida',
    async (status) => {
      const fetchFn = respond(200, { RecognitionStatus: status });
      expect(await createHttpSpeechClient(config(fetchFn)).transcribe(audio)).toEqual({
        ok: false,
        reason: 'NOT_RECOGNIZED',
      });
    },
  );

  test('CT-CLI-12: sucesso sem texto também é fala não reconhecida', async () => {
    const fetchFn = respond(200, { RecognitionStatus: 'Success', DisplayText: '  ' });
    expect(await createHttpSpeechClient(config(fetchFn)).transcribe(audio)).toMatchObject({
      ok: false,
    });
  });

  test.each([
    ['falha de rede', jest.fn().mockRejectedValue(new TypeError('rede'))],
    ['HTTP 401', respond(401)],
    ['status Error do serviço', respond(200, { RecognitionStatus: 'Error' })],
    ['resposta fora do contrato', respond(200, { outra: 'coisa' })],
    ['corpo que não é JSON', respond(200)],
  ])('CT-CLI-13: %s vira UpstreamError', async (_nome, fetchFn) => {
    await expect(
      createHttpSpeechClient(config(fetchFn as unknown as typeof fetch)).transcribe(audio),
    ).rejects.toBeInstanceOf(UpstreamError);
  });

  test('CT-CLI-14: sem configuração, o cliente falha com segurança', async () => {
    await expect(unavailableSpeechClient.transcribe(audio)).rejects.toBeInstanceOf(UpstreamError);
  });
});
