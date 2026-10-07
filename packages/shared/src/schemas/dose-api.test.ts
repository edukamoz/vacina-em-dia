import {
  apiErrorSchema,
  calendarSourceSchema,
  customDoseInputSchema,
  doseIdSchema,
  doseResponseSchema,
} from './dose-api';

const dose = {
  id: 'ex-1',
  memberId: 'm-1',
  origin: 'OFFICIAL',
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

  describe('dose avulsa (RF04)', () => {
    const avulsa = { vaccine: ' Febre tifoide ', doseLabel: ' 1ª dose ', dueDate: '2026-11-04' };

    test('CT-AV-S01: aceita a dose avulsa e tira os espaços das pontas', () => {
      expect(customDoseInputSchema.parse(avulsa)).toEqual({
        vaccine: 'Febre tifoide',
        doseLabel: '1ª dose',
        dueDate: '2026-11-04',
      });
    });

    test.each([
      ['nome vazio', { ...avulsa, vaccine: '   ' }],
      ['nome de uma letra', { ...avulsa, vaccine: 'A' }],
      ['nome longo demais', { ...avulsa, vaccine: 'a'.repeat(81) }],
      ['nome com caractere de controle', { ...avulsa, vaccine: 'Raiva\u0000' }],
      ['dose vazia', { ...avulsa, doseLabel: '' }],
      ['dose longa demais', { ...avulsa, doseLabel: 'a'.repeat(41) }],
      ['data inexistente', { ...avulsa, dueDate: '2026-02-30' }],
      ['data fora do formato', { ...avulsa, dueDate: '04/11/2026' }],
      ['sem data', { vaccine: 'Raiva', doseLabel: '1ª dose' }],
    ])('CT-AV-S02: rejeita dose avulsa com %s', (_nome, value) => {
      expect(customDoseInputSchema.safeParse(value).success).toBe(false);
    });

    test('CT-AV-S03: a resposta de uma dose avulsa não tem linha do calendário', () => {
      const resposta = {
        ...dose,
        origin: 'CUSTOM',
        ruleId: null,
        diseases: '',
        timingKind: 'CUSTOM',
        timingLabel: 'Data escolhida por você',
      };
      expect(doseResponseSchema.safeParse(resposta).success).toBe(true);
      expect(doseResponseSchema.safeParse({ ...resposta, origin: 'OUTRA' }).success).toBe(false);
    });
  });
});
