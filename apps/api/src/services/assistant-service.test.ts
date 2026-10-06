import type { AssistantReply, NlpSearchResponse } from '@vacina/shared';
import {
  UpstreamError,
  type NlpClient,
  type RateLimiter,
  type SpeechClient,
  type SpeechResult,
} from './assistant-ports';
import {
  CHAT_RULES,
  MAX_AUDIO_BYTES,
  VOICE_RULES,
  createAssistantService,
} from './assistant-service';

const REPLY: AssistantReply = {
  intent: 'vacina_para_que_serve',
  text: 'BCG: protege contra a tuberculose.',
  confidence: 0.9,
  source: { name: 'Calendário Nacional de Vacinação 2026' },
  suggestions: [],
  fallback: false,
  safety: false,
};
const SEARCH: NlpSearchResponse = {
  results: [
    { vaccine: 'BCG', score: 0.8, diseases: 'tuberculose', indications: ['Criança: dose única'] },
  ],
  source: { name: 'Calendário Nacional de Vacinação 2026' },
  notice: 'O aplicativo não substitui a caderneta oficial.',
};

/** Áudio mínimo que parece um WAV (cabeçalho RIFF/WAVE de 44 bytes). */
function wav(size = 3200): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  bytes.set([0x57, 0x41, 0x56, 0x45], 8); // WAVE
  return bytes;
}

function build(
  overrides: { nlp?: Partial<NlpClient>; speech?: SpeechClient; limiter?: RateLimiter } = {},
) {
  const nlp: NlpClient = {
    chat: jest.fn().mockResolvedValue(REPLY),
    search: jest.fn().mockResolvedValue(SEARCH),
    ...overrides.nlp,
  };
  const speech: SpeechClient = overrides.speech ?? {
    transcribe: jest.fn().mockResolvedValue({ ok: true, text: 'para que serve a BCG' }),
  };
  const limiter: RateLimiter = overrides.limiter ?? {
    consume: jest.fn().mockResolvedValue({ allowed: true }),
  };
  return { service: createAssistantService({ nlp, speech, limiter }), nlp, speech, limiter };
}

describe('serviço do assistente (RF06 e RF07)', () => {
  test('CT-AST-01: pergunta em texto devolve a resposta e a busca, sem transcrição', async () => {
    const { service, nlp, limiter } = build();
    const result = await service.message('dono-1', 'para que serve a BCG');
    expect(result).toEqual({
      ok: true,
      value: {
        transcript: null,
        reply: REPLY,
        results: SEARCH.results,
        notice: SEARCH.notice,
      },
    });
    expect(nlp.chat).toHaveBeenCalledWith('para que serve a BCG');
    expect(nlp.search).toHaveBeenCalledWith('para que serve a BCG');
    expect(limiter.consume).toHaveBeenCalledWith('dono-1', CHAT_RULES);
  });

  test('CT-AST-02: voz transcreve, responde e devolve a transcrição', async () => {
    const { service, speech, limiter } = build();
    const audio = wav();
    const result = await service.voice('dono-1', audio);
    expect(result).toMatchObject({
      ok: true,
      value: { transcript: 'para que serve a BCG', reply: REPLY },
    });
    expect(speech.transcribe).toHaveBeenCalledWith(audio);
    expect(limiter.consume).toHaveBeenCalledWith('dono-1', VOICE_RULES);
  });

  test('CT-AST-03: limite de uso atingido devolve RATE_LIMITED e não chama ninguém', async () => {
    const limiter: RateLimiter = {
      consume: jest.fn().mockResolvedValue({ allowed: false, retryAfterSeconds: 120 }),
    };
    const { service, nlp, speech } = build({ limiter });
    expect(await service.message('d', 'oi')).toEqual({
      ok: false,
      error: { code: 'RATE_LIMITED', retryAfterSeconds: 120 },
    });
    expect(await service.voice('d', wav())).toEqual({
      ok: false,
      error: { code: 'RATE_LIMITED', retryAfterSeconds: 120 },
    });
    expect(nlp.chat).not.toHaveBeenCalled();
    expect(speech.transcribe).not.toHaveBeenCalled();
  });

  test('CT-AST-04: áudio grande demais ou que não é WAV é recusado antes de gastar o limite', async () => {
    const { service, limiter, speech } = build();
    expect(await service.voice('d', new Uint8Array(MAX_AUDIO_BYTES + 1))).toEqual({
      ok: false,
      error: { code: 'AUDIO_TOO_LARGE' },
    });
    expect(await service.voice('d', new Uint8Array(3200))).toEqual({
      ok: false,
      error: { code: 'UNSUPPORTED_AUDIO' },
    });
    expect(await service.voice('d', new Uint8Array(10))).toEqual({
      ok: false,
      error: { code: 'UNSUPPORTED_AUDIO' },
    });
    expect(limiter.consume).not.toHaveBeenCalled();
    expect(speech.transcribe).not.toHaveBeenCalled();
  });

  test('CT-AST-05: fala não reconhecida devolve SPEECH_NOT_RECOGNIZED sem chamar o PLN', async () => {
    const result: SpeechResult = { ok: false, reason: 'NOT_RECOGNIZED' };
    const { service, nlp } = build({ speech: { transcribe: jest.fn().mockResolvedValue(result) } });
    expect(await service.voice('d', wav())).toEqual({
      ok: false,
      error: { code: 'SPEECH_NOT_RECOGNIZED' },
    });
    expect(nlp.chat).not.toHaveBeenCalled();
  });

  test('CT-AST-06: falha do PLN ou da voz vira ASSISTANT_UNAVAILABLE', async () => {
    const semPln = build({
      nlp: { chat: jest.fn().mockRejectedValue(new UpstreamError()) },
    });
    expect(await semPln.service.message('d', 'oi')).toEqual({
      ok: false,
      error: { code: 'ASSISTANT_UNAVAILABLE' },
    });
    const semVoz = build({
      speech: { transcribe: jest.fn().mockRejectedValue(new UpstreamError()) },
    });
    expect(await semVoz.service.voice('d', wav())).toEqual({
      ok: false,
      error: { code: 'ASSISTANT_UNAVAILABLE' },
    });
  });

  test('CT-AST-07: erro inesperado não é engolido (vira 500 na borda)', async () => {
    const { service } = build({ nlp: { chat: jest.fn().mockRejectedValue(new RangeError('x')) } });
    await expect(service.message('d', 'oi')).rejects.toThrow(RangeError);
    const voz = build({
      speech: { transcribe: jest.fn().mockRejectedValue(new RangeError('x')) },
    });
    await expect(voz.service.voice('d', wav())).rejects.toThrow(RangeError);
  });

  test('CT-AST-08: a voz usa a transcrição como pergunta ao PLN', async () => {
    const { service, nlp } = build();
    await service.voice('d', wav());
    expect(nlp.chat).toHaveBeenCalledWith('para que serve a BCG');
  });
});
