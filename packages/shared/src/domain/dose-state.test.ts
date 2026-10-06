import { addDays } from './civil-date';
import type { Actor, DoseEvent, DoseSnapshot, DoseStatus, TransitionId } from './dose-state';
import { createDose, transitionDose } from './dose-state';

/** "Hoje" fixo: nenhum teste depende do relógio real (CLAUDE.md §7 e §11). */
const D = '2026-10-15';

function dose(status: DoseStatus, overrides: Partial<DoseSnapshot> = {}): DoseSnapshot {
  return Object.freeze({
    status,
    dueDate: addDays(D, 10),
    scheduledDate: null,
    appliedDate: null,
    ...overrides,
  });
}

function run(snapshot: DoseSnapshot, event: DoseEvent, actor: Actor = 'USER') {
  return transitionDose(snapshot, event, { today: D, actor });
}

function expectOk(result: ReturnType<typeof run>) {
  if (!result.ok) throw new Error(`esperava sucesso, veio ${JSON.stringify(result.error)}`);
  return result;
}

function expectError(result: ReturnType<typeof run>) {
  if (result.ok) throw new Error('esperava erro, veio sucesso');
  return result.error;
}

describe('cobertura de estados (5 de 5)', () => {
  test('CT-E01: Pendente, ao gerar a dose do calendário (T1)', () => {
    const created = createDose(addDays(D, 30));
    expect(created).toEqual({
      status: 'PENDING',
      dueDate: addDays(D, 30),
      scheduledDate: null,
      appliedDate: null,
    });
  });

  test('CT-E02: Agendada, ao agendar para D+3 (T2)', () => {
    const r = expectOk(run(dose('PENDING'), { type: 'SCHEDULE', date: addDays(D, 3) }));
    expect(r.dose.status).toBe('SCHEDULED');
    expect(r.dose.scheduledDate).toBe(addDays(D, 3));
  });

  test('CT-E03: Atrasada, quando a rotina avalia prazo vencido (T4)', () => {
    const r = expectOk(
      run(dose('PENDING', { dueDate: addDays(D, -1) }), { type: 'MARK_OVERDUE' }, 'SCHEDULER'),
    );
    expect(r.dose.status).toBe('OVERDUE');
  });

  test('CT-E04: Aplicada, ao registrar a aplicação em D (T3)', () => {
    const r = expectOk(run(dose('PENDING'), { type: 'APPLY', date: D }));
    expect(r.dose.status).toBe('APPLIED');
    expect(r.dose.appliedDate).toBe(D);
  });

  test('CT-E05: Cancelada, ao cancelar com confirmação (T5)', () => {
    const r = expectOk(run(dose('PENDING'), { type: 'CANCEL', confirmed: true }));
    expect(r.dose.status).toBe('CANCELLED');
  });
});

describe('cobertura de transições (T1 a T12)', () => {
  const cases: Array<
    [string, TransitionId, DoseSnapshot, DoseEvent, Actor, DoseStatus, Partial<DoseSnapshot>]
  > = [
    [
      'CT-T02',
      'T2',
      dose('PENDING'),
      { type: 'SCHEDULE', date: addDays(D, 7) },
      'USER',
      'SCHEDULED',
      { scheduledDate: addDays(D, 7) },
    ],
    [
      'CT-T03',
      'T3',
      dose('PENDING'),
      { type: 'APPLY', date: D },
      'USER',
      'APPLIED',
      { appliedDate: D },
    ],
    [
      'CT-T04',
      'T4',
      dose('PENDING', { dueDate: addDays(D, -1) }),
      { type: 'MARK_OVERDUE' },
      'SCHEDULER',
      'OVERDUE',
      {},
    ],
    ['CT-T05', 'T5', dose('PENDING'), { type: 'CANCEL', confirmed: true }, 'USER', 'CANCELLED', {}],
    [
      'CT-T06',
      'T6',
      dose('SCHEDULED', { scheduledDate: addDays(D, 2) }),
      { type: 'APPLY', date: D },
      'USER',
      'APPLIED',
      { appliedDate: D },
    ],
    [
      'CT-T07',
      'T7',
      dose('SCHEDULED', { scheduledDate: addDays(D, -1) }),
      { type: 'MARK_OVERDUE' },
      'SCHEDULER',
      'OVERDUE',
      {},
    ],
    [
      'CT-T08',
      'T8',
      dose('SCHEDULED', { scheduledDate: addDays(D, 5) }),
      { type: 'UNSCHEDULE' },
      'USER',
      'PENDING',
      { scheduledDate: null },
    ],
    [
      'CT-T09',
      'T9',
      dose('SCHEDULED', { scheduledDate: addDays(D, 5) }),
      { type: 'CANCEL', confirmed: true },
      'USER',
      'CANCELLED',
      {},
    ],
    [
      'CT-T10',
      'T10',
      dose('OVERDUE'),
      { type: 'RESCHEDULE', date: addDays(D, 2) },
      'USER',
      'SCHEDULED',
      { scheduledDate: addDays(D, 2) },
    ],
    [
      'CT-T11',
      'T11',
      dose('OVERDUE'),
      { type: 'APPLY', date: D },
      'USER',
      'APPLIED',
      { appliedDate: D },
    ],
    [
      'CT-T12',
      'T12',
      dose('OVERDUE'),
      { type: 'CANCEL', confirmed: true },
      'USER',
      'CANCELLED',
      {},
    ],
  ];

  test('CT-T01: inicial para Pendente (T1)', () => {
    expect(createDose(addDays(D, 1)).status).toBe('PENDING');
  });

  test.each(cases)('%s: %s', (_id, transition, snapshot, event, actor, expectedStatus, extra) => {
    const r = expectOk(run(snapshot, event, actor));
    expect(r.transition).toBe(transition);
    expect(r.dose.status).toBe(expectedStatus);
    expect(r.dose).toMatchObject(extra);
  });

  test('a transição devolve o tipo de evento para o registro de auditoria', () => {
    const r = expectOk(run(dose('PENDING'), { type: 'APPLY', date: D }));
    expect(r.eventType).toBe('APPLY');
  });
});

describe('guardas das transições (valores limite)', () => {
  test('CT-G01: agendar com data igual a hoje é aceito', () => {
    const r = expectOk(run(dose('PENDING'), { type: 'SCHEDULE', date: D }));
    expect(r.dose.status).toBe('SCHEDULED');
  });

  test('CT-G02: agendar com data de ontem é rejeitado e a dose permanece Pendente', () => {
    const original = dose('PENDING');
    const error = expectError(run(original, { type: 'SCHEDULE', date: addDays(D, -1) }));
    expect(error).toMatchObject({ code: 'GUARD_VIOLATION', reason: 'DATE_IN_PAST' });
    expect(original.status).toBe('PENDING');
  });

  test('CT-G03: registrar aplicação com data D é aceito', () => {
    expect(expectOk(run(dose('PENDING'), { type: 'APPLY', date: D })).dose.status).toBe('APPLIED');
  });

  test('CT-G04: registrar aplicação com data de amanhã é rejeitado', () => {
    const error = expectError(run(dose('PENDING'), { type: 'APPLY', date: addDays(D, 1) }));
    expect(error).toMatchObject({ code: 'GUARD_VIOLATION', reason: 'DATE_IN_FUTURE' });
  });

  test('CT-G05: prazo igual a hoje não vence (a rotina não atrasa a dose)', () => {
    const error = expectError(
      run(dose('PENDING', { dueDate: D }), { type: 'MARK_OVERDUE' }, 'SCHEDULER'),
    );
    expect(error).toMatchObject({ code: 'GUARD_VIOLATION', reason: 'NOT_OVERDUE' });
  });

  test('CT-G06: prazo de ontem vence e a rotina atrasa a dose', () => {
    const r = expectOk(
      run(dose('PENDING', { dueDate: addDays(D, -1) }), { type: 'MARK_OVERDUE' }, 'SCHEDULER'),
    );
    expect(r.dose.status).toBe('OVERDUE');
  });

  test('CT-G07: reagendar com data de ontem é rejeitado e a dose permanece Atrasada', () => {
    const error = expectError(run(dose('OVERDUE'), { type: 'RESCHEDULE', date: addDays(D, -1) }));
    expect(error).toMatchObject({ code: 'GUARD_VIOLATION', reason: 'DATE_IN_PAST' });
  });

  test.each([
    ['T5', dose('PENDING')],
    ['T9', dose('SCHEDULED', { scheduledDate: addDays(D, 1) })],
    ['T12', dose('OVERDUE')],
  ] as const)('CT-G08: cancelar sem confirmação não cancela (%s)', (_t, snapshot) => {
    const error = expectError(run(snapshot, { type: 'CANCEL', confirmed: false }));
    expect(error).toMatchObject({ code: 'GUARD_VIOLATION', reason: 'CONFIRMATION_REQUIRED' });
  });

  test('agendamento vencido (T7) só vence se a data for anterior a hoje', () => {
    const error = expectError(
      run(dose('SCHEDULED', { scheduledDate: D }), { type: 'MARK_OVERDUE' }, 'SCHEDULER'),
    );
    expect(error).toMatchObject({ code: 'GUARD_VIOLATION', reason: 'NOT_OVERDUE' });
  });
});

describe('transições inválidas (rejeitadas com erro de transição, HTTP 409)', () => {
  const invalid: Array<[string, DoseSnapshot, DoseEvent, Actor]> = [
    ['CT-I01', dose('APPLIED', { appliedDate: D }), { type: 'SCHEDULE', date: D }, 'USER'],
    ['CT-I02', dose('APPLIED', { appliedDate: D }), { type: 'CANCEL', confirmed: true }, 'USER'],
    ['CT-I03', dose('APPLIED', { appliedDate: D }), { type: 'APPLY', date: D }, 'USER'],
    ['CT-I04', dose('CANCELLED'), { type: 'SCHEDULE', date: D }, 'USER'],
    ['CT-I05', dose('CANCELLED'), { type: 'APPLY', date: D }, 'USER'],
    ['CT-I06', dose('PENDING'), { type: 'UNSCHEDULE' }, 'USER'],
    [
      'CT-I07',
      dose('SCHEDULED', { scheduledDate: addDays(D, 3) }),
      { type: 'SCHEDULE', date: addDays(D, 4) },
      'USER',
    ],
    ['CT-I08', dose('OVERDUE'), { type: 'UNSCHEDULE' }, 'USER'],
  ];

  test.each(invalid)('%s: %s', (_id, snapshot, event, actor) => {
    const error = expectError(run(snapshot, event, actor));
    expect(error).toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  test('CT-I09: o cliente não pode forçar o atraso; só a rotina de prazo', () => {
    const error = expectError(run(dose('PENDING'), { type: 'MARK_OVERDUE' }, 'USER'));
    expect(error).toMatchObject({ code: 'GUARD_VIOLATION', reason: 'SCHEDULER_ONLY' });
  });

  test('Atrasada não pode voltar a Pendente nem ser agendada pelo evento de primeiro agendamento', () => {
    expect(expectError(run(dose('OVERDUE'), { type: 'SCHEDULE', date: D })).code).toBe(
      'INVALID_TRANSITION',
    );
  });

  test('o erro informa o estado de origem e o evento, sem detalhes internos', () => {
    const error = expectError(run(dose('APPLIED', { appliedDate: D }), { type: 'APPLY', date: D }));
    expect(error).toMatchObject({ from: 'APPLIED', event: 'APPLY' });
    expect(error.message).not.toMatch(/stack|undefined|null/i);
  });
});

describe('cobertura de caminhos (sequências específicas)', () => {
  type Step = { event: DoseEvent; actor?: Actor; expected: DoseStatus; transition: TransitionId };

  function walk(initial: DoseSnapshot, steps: Step[]) {
    let current = initial;
    for (const step of steps) {
      const r = expectOk(run(current, step.event, step.actor ?? 'USER'));
      expect(r.transition).toBe(step.transition);
      expect(r.dose.status).toBe(step.expected);
      current = r.dose;
    }
    return current;
  }

  const vencida = createDose(addDays(D, -1));
  const futura = createDose(addDays(D, 20));
  /** Como a rotina só atrasa o que venceu, o relógio andou: avança-se "hoje" por passo. */
  const futureToday = (days: number) => ({ today: addDays(D, days), actor: 'SCHEDULER' as Actor });

  test('CT-C01: aplicação direta (T1, T3)', () => {
    walk(futura, [{ event: { type: 'APPLY', date: D }, expected: 'APPLIED', transition: 'T3' }]);
  });

  test('CT-C02: agendar e aplicar (T1, T2, T6)', () => {
    walk(futura, [
      { event: { type: 'SCHEDULE', date: D }, expected: 'SCHEDULED', transition: 'T2' },
      { event: { type: 'APPLY', date: D }, expected: 'APPLIED', transition: 'T6' },
    ]);
  });

  test('CT-C03: atrasar e aplicar tarde (T1, T4, T11)', () => {
    walk(vencida, [
      {
        event: { type: 'MARK_OVERDUE' },
        actor: 'SCHEDULER',
        expected: 'OVERDUE',
        transition: 'T4',
      },
      { event: { type: 'APPLY', date: D }, expected: 'APPLIED', transition: 'T11' },
    ]);
  });

  test('CT-C04: agendar, atrasar, reagendar e aplicar (T1, T2, T7, T10, T6)', () => {
    const s1 = expectOk(run(futura, { type: 'SCHEDULE', date: addDays(D, 1) }));
    expect(s1.transition).toBe('T2');
    const s2 = expectOk(transitionDose(s1.dose, { type: 'MARK_OVERDUE' }, futureToday(2)));
    expect(s2.transition).toBe('T7');
    const s3 = expectOk(
      transitionDose(
        s2.dose,
        { type: 'RESCHEDULE', date: addDays(D, 3) },
        { today: addDays(D, 2), actor: 'USER' },
      ),
    );
    expect(s3.transition).toBe('T10');
    const s4 = expectOk(
      transitionDose(
        s3.dose,
        { type: 'APPLY', date: addDays(D, 3) },
        { today: addDays(D, 3), actor: 'USER' },
      ),
    );
    expect(s4.transition).toBe('T6');
    expect(s4.dose.status).toBe('APPLIED');
  });

  test('CT-C05: agendar, desagendar e cancelar (T1, T2, T8, T5)', () => {
    walk(futura, [
      { event: { type: 'SCHEDULE', date: addDays(D, 4) }, expected: 'SCHEDULED', transition: 'T2' },
      { event: { type: 'UNSCHEDULE' }, expected: 'PENDING', transition: 'T8' },
      { event: { type: 'CANCEL', confirmed: true }, expected: 'CANCELLED', transition: 'T5' },
    ]);
  });

  test('CT-C06: atrasar e cancelar (T1, T4, T12)', () => {
    walk(vencida, [
      {
        event: { type: 'MARK_OVERDUE' },
        actor: 'SCHEDULER',
        expected: 'OVERDUE',
        transition: 'T4',
      },
      { event: { type: 'CANCEL', confirmed: true }, expected: 'CANCELLED', transition: 'T12' },
    ]);
  });

  test('CT-C07: ciclo entre Atrasada e Agendada antes de aplicar (T1, T4, T10, T7, T10, T6)', () => {
    const t4 = expectOk(run(vencida, { type: 'MARK_OVERDUE' }, 'SCHEDULER'));
    expect(t4.transition).toBe('T4');
    const t10a = expectOk(run(t4.dose, { type: 'RESCHEDULE', date: addDays(D, 1) }));
    expect(t10a.transition).toBe('T10');
    const t7 = expectOk(transitionDose(t10a.dose, { type: 'MARK_OVERDUE' }, futureToday(2)));
    expect(t7.transition).toBe('T7');
    const t10b = expectOk(
      transitionDose(
        t7.dose,
        { type: 'RESCHEDULE', date: addDays(D, 5) },
        { today: addDays(D, 2), actor: 'USER' },
      ),
    );
    expect(t10b.transition).toBe('T10');
    const t6 = expectOk(
      transitionDose(
        t10b.dose,
        { type: 'APPLY', date: addDays(D, 5) },
        { today: addDays(D, 5), actor: 'USER' },
      ),
    );
    expect(t6.transition).toBe('T6');
    expect(t6.dose.status).toBe('APPLIED');
  });
});

describe('pureza', () => {
  test('não altera o estado recebido', () => {
    const original = dose('PENDING');
    run(original, { type: 'SCHEDULE', date: D });
    expect(original).toEqual(dose('PENDING'));
  });
});
