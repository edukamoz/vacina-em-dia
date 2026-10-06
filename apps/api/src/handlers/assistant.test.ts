import { apiErrorSchema, assistantResponseSchema } from '@vacina/shared';
import type { AssistantService } from '../services/assistant-service';
import { createAssistantHandlers } from './assistant';

const RESPONSE = {
  transcript: null,
  reply: {
    intent: 'saudacao',
    text: 'Olá!',
    confidence: 0.9,
    source: { name: 'Ajuda do Vacina em Dia' },
    suggestions: [],
    fallback: false,
    safety: false,
  },
  results: [],
  notice: 'aviso',
};

function build(overrides: Partial<AssistantService> = {}) {
  const service: AssistantService = {
    message: jest.fn().mockResolvedValue({ ok: true, value: RESPONSE }),
    voice: jest.fn().mockResolvedValue({ ok: true, value: { ...RESPONSE, transcript: 'oi' } }),
    ...overrides,
  };
  return { service, handlers: createAssistantHandlers(service) };
}

describe('handlers do assistente', () => {
  test('CT-AST-H01: pergunta válida devolve 200 com o esquema da resposta', async () => {
    const { handlers, service } = build();
    const res = await handlers.message('dono', { text: '  Para que serve a BCG?  ' });
    expect(res.status).toBe(200);
    expect(assistantResponseSchema.safeParse(res.jsonBody).success).toBe(true);
    expect(service.message).toHaveBeenCalledWith('dono', 'Para que serve a BCG?');
  });

  test.each([
    ['corpo ausente', undefined],
    ['texto vazio', { text: '   ' }],
    ['texto longo demais', { text: 'a'.repeat(301) }],
    ['texto que não é string', { text: 5 }],
  ])('CT-AST-H02: %s devolve 400 sem repetir o que foi enviado', async (_nome, body) => {
    const { handlers, service } = build();
    const res = await handlers.message('dono', body);
    expect(res.status).toBe(400);
    expect(apiErrorSchema.safeParse(res.jsonBody).success).toBe(true);
    expect(service.message).not.toHaveBeenCalled();
  });

  test('CT-AST-H03: voz em WAV devolve 200 com a transcrição', async () => {
    const { handlers, service } = build();
    const audio = new Uint8Array([1, 2]);
    const res = await handlers.voice('dono', 'audio/wav', audio);
    expect(res.status).toBe(200);
    expect(res.jsonBody).toMatchObject({ transcript: 'oi' });
    expect(service.voice).toHaveBeenCalledWith('dono', audio);
  });

  test.each([undefined, null, '', 'audio/webm', 'application/json', 'text/plain'])(
    'CT-AST-H04: tipo de conteúdo %p devolve 415',
    async (tipo) => {
      const { handlers, service } = build();
      const res = await handlers.voice('dono', tipo, new Uint8Array([1]));
      expect(res.status).toBe(415);
      expect(service.voice).not.toHaveBeenCalled();
    },
  );

  test.each(['audio/wav', 'audio/x-wav', 'audio/wav; codecs=audio/pcm; samplerate=16000'])(
    'CT-AST-H05: aceita o tipo %s',
    async (tipo) => {
      const { handlers } = build();
      expect((await handlers.voice('dono', tipo, new Uint8Array([1]))).status).toBe(200);
    },
  );

  test.each([
    ['RATE_LIMITED', { code: 'RATE_LIMITED' as const, retryAfterSeconds: 90 }, 429],
    ['ASSISTANT_UNAVAILABLE', { code: 'ASSISTANT_UNAVAILABLE' as const }, 503],
    ['SPEECH_NOT_RECOGNIZED', { code: 'SPEECH_NOT_RECOGNIZED' as const }, 422],
    ['AUDIO_TOO_LARGE', { code: 'AUDIO_TOO_LARGE' as const }, 413],
    ['UNSUPPORTED_AUDIO', { code: 'UNSUPPORTED_AUDIO' as const }, 415],
  ])('CT-AST-H06: erro %s vira HTTP %i no formato de erro da API', async (_nome, error, status) => {
    const { handlers } = build({
      message: jest.fn().mockResolvedValue({ ok: false, error }),
      voice: jest.fn().mockResolvedValue({ ok: false, error }),
    });
    const texto = await handlers.message('dono', { text: 'oi' });
    const voz = await handlers.voice('dono', 'audio/wav', new Uint8Array([1]));
    for (const res of [texto, voz]) {
      expect(res.status).toBe(status);
      expect(apiErrorSchema.safeParse(res.jsonBody).success).toBe(true);
    }
    if (error.code === 'RATE_LIMITED') expect(texto.headers).toEqual({ 'retry-after': '90' });
  });
});
