import { apiErrorSchema, calendarSourceSchema, doseIdSchema, doseResponseSchema } from './dose-api';

const dose = {
  id: 'ex-1',
  memberId: 'm-1',
  ruleId: 'crianca-penta-1',
  vaccine: 'penta (DTP+Hib+HB)',
  doseLabel: '1ª dose',
  diseases: 'difteria, tétano',
  timingKind: 'AGE',
  timingLabel: '2 meses',
  conditional: false,
  notes: [],
  status: 'PENDING',
  dueDate: '2026-11-04',
  scheduledDate: null,
  appliedDate: null,
};

describe('esquemas de resposta da API de doses', () => {
  test('CT-API-S01: aceita uma dose válida', () => {
    expect(doseResponseSchema.safeParse(dose).success).toBe(true);
  });

  test.each([
    ['estado desconhecido', { ...dose, status: 'LATE' }],
    ['data inexistente', { ...dose, dueDate: '2026-02-30' }],
    ['campo obrigatório ausente', { ...dose, vaccine: undefined }],
  ])('CT-API-S02: rejeita dose com %s', (_nome, value) => {
    expect(doseResponseSchema.safeParse(value).success).toBe(false);
  });

  test.each(['ex-1', 'a', 'dose-123'])('CT-API-S03: aceita o identificador %s', (id) => {
    expect(doseIdSchema.safeParse(id).success).toBe(true);
  });

  test.each(['', 'Ex-1', 'ex_1', "ex-1'; DROP", 'a'.repeat(41), '../x'])(
    'CT-API-S04: rejeita o identificador %p',
    (id) => {
      expect(doseIdSchema.safeParse(id).success).toBe(false);
    },
  );

  test('CT-API-S05: a fonte do calendário exige versão e aviso', () => {
    const source = {
      name: 'x',
      publisher: 'y',
      version: '1',
      url: 'https://exemplo.gov.br',
      retrievedAt: '2026-10-06',
      isFictitious: false,
      notice: 'aviso',
    };
    expect(calendarSourceSchema.safeParse(source).success).toBe(true);
    expect(calendarSourceSchema.safeParse({ ...source, version: undefined }).success).toBe(false);
  });

  test('CT-API-S06: o erro só aceita códigos conhecidos', () => {
    expect(apiErrorSchema.safeParse({ code: 'NOT_FOUND', message: 'm' }).success).toBe(true);
    expect(apiErrorSchema.safeParse({ code: 'STACK_TRACE', message: 'm' }).success).toBe(false);
  });
});
