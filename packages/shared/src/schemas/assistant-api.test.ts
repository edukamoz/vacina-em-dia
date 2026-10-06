import {
  ASSISTANT_TEXT_MAX_LENGTH,
  assistantMessageInputSchema,
  assistantResponseSchema,
  nlpSearchResponseSchema,
} from './assistant-api';

const reply = {
  intent: 'saudacao',
  text: 'Olá!',
  confidence: 0.9,
  source: { name: 'Ajuda do Vacina em Dia' },
  suggestions: ['O que você faz?'],
  fallback: false,
  safety: false,
};

describe('esquemas do assistente', () => {
  test('CT-AST-S01: a pergunta é aparada e limitada a 300 caracteres', () => {
    expect(assistantMessageInputSchema.parse({ text: '  oi  ' })).toEqual({ text: 'oi' });
    expect(assistantMessageInputSchema.safeParse({ text: '   ' }).success).toBe(false);
    expect(
      assistantMessageInputSchema.safeParse({ text: 'a'.repeat(ASSISTANT_TEXT_MAX_LENGTH + 1) })
        .success,
    ).toBe(false);
    expect(assistantMessageInputSchema.safeParse({ text: 5 }).success).toBe(false);
  });

  test('CT-AST-S02: a resposta exige transcrição (ou nulo), resposta, resultados e aviso', () => {
    const ok = { transcript: null, reply, results: [], notice: 'aviso' };
    expect(assistantResponseSchema.safeParse(ok).success).toBe(true);
    expect(assistantResponseSchema.safeParse({ ...ok, transcript: 'oi' }).success).toBe(true);
    expect(
      assistantResponseSchema.safeParse({ ...ok, reply: { ...reply, confidence: 2 } }).success,
    ).toBe(false);
    expect(assistantResponseSchema.safeParse({ ...ok, notice: undefined }).success).toBe(false);
  });

  test('CT-AST-S03: a busca do PLN traz resultados, fonte e aviso', () => {
    const hit = { vaccine: 'BCG', score: 0.8, diseases: 'tuberculose', indications: ['x'] };
    const ok = { results: [hit], source: { name: 'Calendário', version: '2026' }, notice: 'aviso' };
    expect(nlpSearchResponseSchema.safeParse(ok).success).toBe(true);
    expect(
      nlpSearchResponseSchema.safeParse({ ...ok, results: [{ vaccine: 'BCG' }] }).success,
    ).toBe(false);
  });
});
