import {
  MAX_SERIES_DOSES,
  RECURRENCE_MAX_EVERY,
  addPeriod,
  nextRecurrenceDate,
  type RecurrenceRule,
} from './recurrence';

const regra = (patch: Partial<RecurrenceRule> = {}): RecurrenceRule => ({
  unit: 'YEAR',
  every: 1,
  anchor: 'APPLICATION',
  anchorDate: '2026-03-01',
  endDate: null,
  maxDoses: null,
  ...patch,
});

describe('recorrência: somar um período a uma data', () => {
  test.each([
    ['CT-REC-01', '2026-11-10', 'DAY', 10, '2026-11-20'],
    ['CT-REC-02', '2026-11-10', 'WEEK', 2, '2026-11-24'],
    ['CT-REC-03', '2026-11-10', 'MONTH', 6, '2027-05-10'],
    ['CT-REC-04', '2026-11-10', 'YEAR', 1, '2027-11-10'],
    ['CT-REC-05', '2026-01-31', 'MONTH', 1, '2026-02-28'],
    ['CT-REC-06', '2024-02-29', 'YEAR', 1, '2025-02-28'],
    ['CT-REC-07', '2024-02-29', 'YEAR', 4, '2028-02-29'],
    ['CT-REC-08', '2026-12-25', 'DAY', 10, '2027-01-04'],
  ] as const)('%s: %s + %i %s', (_id, data, unidade, quantas, esperado) => {
    // O quarto argumento é a quantidade de períodos; o terceiro, a unidade.
    expect(addPeriod(data, unidade, quantas)).toBe(esperado);
  });

  test('CT-REC-09: data inválida é recusada', () => {
    expect(() => addPeriod('2026-02-30', 'MONTH', 1)).toThrow(RangeError);
  });

  test.each([0, -1, 1.5, Number.NaN])('CT-REC-10: quantidade inválida (%s) é recusada', (n) => {
    expect(() => addPeriod('2026-11-10', 'DAY', n)).toThrow(RangeError);
  });
});

describe('recorrência: próxima data contando da aplicação', () => {
  test.each([
    ['CT-REC-11', regra({ unit: 'YEAR', every: 1 }), '2026-11-10', '2027-11-10'],
    ['CT-REC-12', regra({ unit: 'MONTH', every: 6 }), '2026-11-10', '2027-05-10'],
    ['CT-REC-13', regra({ unit: 'WEEK', every: 2 }), '2026-11-10', '2026-11-24'],
    ['CT-REC-14', regra({ unit: 'MONTH', every: 1 }), '2026-01-31', '2026-02-28'],
  ] as const)('%s: da aplicação', (_id, r, aplicada, esperado) => {
    expect(
      nextRecurrenceDate(r, { occurrence: 1, dueDate: '2026-11-01', appliedDate: aplicada }),
    ).toBe(esperado);
  });

  test('CT-REC-15: aplicar com atraso empurra a próxima (a conta parte da aplicação)', () => {
    const r = regra({ unit: 'MONTH', every: 6 });
    expect(
      nextRecurrenceDate(r, { occurrence: 1, dueDate: '2026-01-10', appliedDate: '2026-03-10' }),
    ).toBe('2026-09-10');
  });
});

describe('recorrência: próxima data na grade fixa (a partir da data prevista)', () => {
  const mensal = regra({ unit: 'MONTH', every: 1, anchor: 'SCHEDULE', anchorDate: '2026-01-31' });

  test('CT-REC-16: no último dia do mês a grade não desliza (31/01, 28/02, 31/03)', () => {
    const fev = nextRecurrenceDate(mensal, {
      occurrence: 1,
      dueDate: '2026-01-31',
      appliedDate: '2026-01-31',
    });
    expect(fev).toBe('2026-02-28');
    const mar = nextRecurrenceDate(mensal, {
      occurrence: 2,
      dueDate: '2026-02-28',
      appliedDate: '2026-02-28',
    });
    expect(mar).toBe('2026-03-31');
  });

  test('CT-REC-17: aplicar antes do prazo mantém a grade (não antecipa a próxima)', () => {
    const anual = regra({ anchor: 'SCHEDULE', anchorDate: '2026-03-01' });
    expect(
      nextRecurrenceDate(anual, {
        occurrence: 1,
        dueDate: '2026-03-01',
        appliedDate: '2026-02-20',
      }),
    ).toBe('2027-03-01');
  });

  test('CT-REC-18: aplicar com muito atraso pula as datas que já passaram', () => {
    const anual = regra({ anchor: 'SCHEDULE', anchorDate: '2024-03-01' });
    expect(
      nextRecurrenceDate(anual, {
        occurrence: 2,
        dueDate: '2025-03-01',
        appliedDate: '2026-11-10',
      }),
    ).toBe('2027-03-01');
  });

  test('CT-REC-19: a próxima data é sempre depois da aplicação e da data prevista', () => {
    const r = regra({ unit: 'WEEK', every: 3, anchor: 'SCHEDULE', anchorDate: '2026-01-05' });
    for (const aplicada of ['2026-01-05', '2026-01-20', '2026-02-01', '2026-06-30']) {
      const proxima = nextRecurrenceDate(r, {
        occurrence: 1,
        dueDate: '2026-01-05',
        appliedDate: aplicada,
      });
      expect(proxima).not.toBeNull();
      expect(String(proxima) > aplicada).toBe(true);
      expect(String(proxima) > '2026-01-05').toBe(true);
    }
  });
});

describe('recorrência: quando a série termina', () => {
  const contexto = { occurrence: 1, dueDate: '2026-11-10', appliedDate: '2026-11-10' } as const;

  test('CT-REC-20: a data final impede a próxima dose', () => {
    expect(nextRecurrenceDate(regra({ endDate: '2027-11-09' }), contexto)).toBeNull();
  });

  test('CT-REC-21: a próxima dose pode cair exatamente na data final', () => {
    expect(nextRecurrenceDate(regra({ endDate: '2027-11-10' }), contexto)).toBe('2027-11-10');
  });

  test.each([
    ['CT-REC-22', 3, 2, '2027-11-10'],
    ['CT-REC-23', 3, 3, null],
    ['CT-REC-24', 3, 4, null],
  ] as const)('%s: máximo de %i doses, já tomada a %iª', (_id, maximo, ocorrencia, esperado) => {
    expect(
      nextRecurrenceDate(regra({ maxDoses: maximo }), { ...contexto, occurrence: ocorrencia }),
    ).toBe(esperado);
  });

  test('CT-REC-25: sem máximo, o teto de segurança da série vale', () => {
    expect(
      nextRecurrenceDate(regra(), { ...contexto, occurrence: MAX_SERIES_DOSES - 1 }),
    ).not.toBeNull();
    expect(nextRecurrenceDate(regra(), { ...contexto, occurrence: MAX_SERIES_DOSES })).toBeNull();
  });

  test('CT-REC-26: os limites de cada unidade estão definidos', () => {
    expect(RECURRENCE_MAX_EVERY).toEqual({ DAY: 365, WEEK: 104, MONTH: 120, YEAR: 50 });
  });

  test('CT-REC-27: ocorrência inválida é recusada', () => {
    expect(() => nextRecurrenceDate(regra(), { ...contexto, occurrence: 0 })).toThrow(RangeError);
  });
});
