import { customDoseInputSchema, doseResponseSchema } from './dose-api';
import { doseEventInputSchema } from './dose';

const base = { vaccine: 'Gripe', doseLabel: 'Anual', dueDate: '2026-12-01' };
const anual = { unit: 'YEAR', every: 1, anchor: 'APPLICATION' };

describe('esquema da dose avulsa com repetição', () => {
  test('CT-REC-50: sem repetição continua valendo como antes', () => {
    expect(customDoseInputSchema.safeParse(base).success).toBe(true);
  });

  test.each([
    ['CT-REC-51', { ...anual }],
    ['CT-REC-52', { unit: 'MONTH', every: 6, anchor: 'SCHEDULE' }],
    ['CT-REC-53', { ...anual, endDate: '2030-12-01' }],
    ['CT-REC-54', { ...anual, maxDoses: 5 }],
    ['CT-REC-55', { unit: 'DAY', every: 365, anchor: 'APPLICATION' }],
    ['CT-REC-56', { unit: 'YEAR', every: 50, anchor: 'APPLICATION' }],
  ])('%s: aceita a repetição %j', (_id, recurrence) => {
    expect(customDoseInputSchema.safeParse({ ...base, recurrence }).success).toBe(true);
  });

  test.each([
    ['CT-REC-57', { unit: 'HOUR', every: 1, anchor: 'APPLICATION' }],
    ['CT-REC-58', { ...anual, every: 0 }],
    ['CT-REC-59', { ...anual, every: 1.5 }],
    ['CT-REC-60', { ...anual, every: 51 }],
    ['CT-REC-61', { unit: 'MONTH', every: 121, anchor: 'APPLICATION' }],
    ['CT-REC-62', { unit: 'WEEK', every: 105, anchor: 'APPLICATION' }],
    ['CT-REC-63', { unit: 'DAY', every: 366, anchor: 'APPLICATION' }],
    ['CT-REC-64', { ...anual, anchor: 'SEMPRE' }],
    ['CT-REC-65', { unit: 'YEAR', every: 1 }],
    ['CT-REC-66', { ...anual, maxDoses: 1 }],
    ['CT-REC-67', { ...anual, maxDoses: 121 }],
    ['CT-REC-68', { ...anual, endDate: '2026-02-30' }],
    ['CT-REC-69', { ...anual, endDate: '2026-12-01' }],
    ['CT-REC-70', { ...anual, endDate: '2026-11-30' }],
  ])('%s: recusa a repetição %j', (_id, recurrence) => {
    expect(customDoseInputSchema.safeParse({ ...base, recurrence }).success).toBe(false);
  });

  test.each([
    ['CT-REC-71', 0, true],
    ['CT-REC-72', 60, true],
    ['CT-REC-73', 61, false],
    ['CT-REC-74', -1, false],
    ['CT-REC-75', 2.5, false],
  ])('%s: aviso antecipado de %s dias', (_id, remindDaysBefore, valido) => {
    expect(customDoseInputSchema.safeParse({ ...base, remindDaysBefore }).success).toBe(valido);
  });

  test('CT-REC-76: o aviso antecipado pode ficar vazio (usa o padrão)', () => {
    expect(customDoseInputSchema.safeParse({ ...base, remindDaysBefore: null }).success).toBe(true);
  });
});

describe('cancelamento de uma dose que se repete', () => {
  test.each([
    ['CT-REC-80', { type: 'CANCEL', confirmed: true }],
    ['CT-REC-81', { type: 'CANCEL', confirmed: true, scope: 'THIS' }],
    ['CT-REC-82', { type: 'CANCEL', confirmed: true, scope: 'SERIES' }],
  ])('%s: aceita %j', (_id, event) => {
    expect(doseEventInputSchema.safeParse(event).success).toBe(true);
  });

  test('CT-REC-83: recusa escopo desconhecido', () => {
    expect(
      doseEventInputSchema.safeParse({ type: 'CANCEL', confirmed: true, scope: 'ALL' }).success,
    ).toBe(false);
  });
});

describe('resposta de dose com repetição', () => {
  const dose = {
    id: 'd-1',
    memberId: 'm-1',
    origin: 'CUSTOM',
    ruleId: null,
    vaccine: 'Gripe',
    doseLabel: 'Anual',
    diseases: '',
    timingKind: 'CUSTOM',
    timingLabel: 'Data escolhida por você',
    conditional: false,
    notes: [],
    status: 'PENDING',
    dueDate: '2026-12-01',
    scheduledDate: null,
    appliedDate: null,
  };

  test('CT-REC-84: a resposta antiga, sem os campos novos, continua válida', () => {
    expect(doseResponseSchema.safeParse(dose).success).toBe(true);
  });

  test('CT-REC-85: aceita a repetição, o número da dose e o aviso antecipado', () => {
    const r = doseResponseSchema.safeParse({
      ...dose,
      recurrence: { ...anual, endDate: null, maxDoses: null },
      occurrence: 2,
      remindDaysBefore: 14,
    });
    expect(r.success).toBe(true);
  });

  test('CT-REC-86: recusa número de dose zero ou negativo', () => {
    expect(doseResponseSchema.safeParse({ ...dose, occurrence: 0 }).success).toBe(false);
  });
});
