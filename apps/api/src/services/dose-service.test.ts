import type { DoseResponse } from '@vacina/shared';
import { OTHER_OWNER, OWNER, buildApp } from '../test-support';

// Hoje (civil, Brasília): 2026-10-06. O bebê nasceu em 2026-01-01, então as doses até os 9 meses
// já venceram e as demais ainda estão no futuro.
const BABY = { name: 'Bebê', birthDate: '2026-01-01', isPregnant: false };

async function setup() {
  const app = buildApp();
  await app.consent();
  const created = await app.members.create(OWNER, BABY);
  if (!created.ok) throw new Error('falhou');
  const memberId = created.value.id;
  const list = async () => {
    const result = await app.doses.listForMember(OWNER, memberId);
    if (!result.ok) throw new Error('calendário ausente');
    return result.value;
  };
  const dose = async (ruleId: string): Promise<DoseResponse> => {
    const found = (await list()).items.find((d) => d.ruleId === ruleId);
    if (!found) throw new Error(`dose ${ruleId} ausente`);
    return found;
  };
  return { app, memberId, list, dose };
}

describe('serviço de doses e calendário do membro (RF03 e RF04)', () => {
  test('CT-API-V01: lista com fonte e versão, ordenada pela data prevista', async () => {
    const { list } = await setup();
    const calendar = await list();
    expect(calendar.source).toMatchObject({ version: '2026', isFictitious: false });
    expect(calendar.source.notice).toMatch(/não substitui a caderneta oficial/);
    expect(calendar.member.ageGroup).toBe('CHILD');
    const dates = calendar.items.map((d) => d.dueDate);
    expect(dates).toEqual([...dates].sort());
    expect(calendar.items[0]?.timingLabel).toBe('Ao nascer');
  });

  test('CT-T04 via API: a rotina de prazo marca como atrasada a dose vencida', async () => {
    const { dose } = await setup();
    expect((await dose('crianca-hepatite-b')).status).toBe('OVERDUE');
    expect((await dose('crianca-penta-1')).status).toBe('OVERDUE');
    expect((await dose('crianca-covid-3')).status).toBe('OVERDUE');
    expect((await dose('crianca-scr-1')).status).toBe('PENDING');
  });

  test('CT-API-V03: dose condicional e dose sem prazo fixo nunca atrasam sozinhas', async () => {
    const { dose } = await setup();
    const conditional = await dose('crianca-febre-amarela-excepcional');
    expect(conditional.dueDate < '2026-10-06').toBe(true);
    expect(conditional).toMatchObject({ status: 'PENDING', conditional: true });
    expect(conditional.notes.length).toBeGreaterThan(0);
  });

  test('CT-API-V04: ler o calendário duas vezes dá o mesmo resultado', async () => {
    const { list } = await setup();
    const first = await list();
    expect(await list()).toEqual(first);
  });

  test('CT-API-V02: busca uma dose e informa quando não existe ou é de outro dono', async () => {
    const { app, dose } = await setup();
    const target = await dose('crianca-scr-1');
    expect(await app.doses.get(OWNER, target.id)).toMatchObject({ ok: true });
    expect(await app.doses.get(OWNER, 'nao-existe')).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
    expect(await app.doses.get(OTHER_OWNER, target.id)).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
  });

  test.each([
    [
      'CT-T02 via API: agendar uma dose pendente',
      'crianca-scr-1',
      { type: 'SCHEDULE', date: '2026-10-10' },
      'SCHEDULED',
    ],
    [
      'CT-T03 via API: aplicar uma dose pendente',
      'crianca-scr-1',
      { type: 'APPLY', date: '2026-10-06' },
      'APPLIED',
    ],
    [
      'CT-T05 via API: cancelar uma dose pendente',
      'crianca-scr-1',
      { type: 'CANCEL', confirmed: true },
      'CANCELLED',
    ],
    [
      'CT-T10 via API: reagendar uma dose atrasada',
      'crianca-penta-1',
      { type: 'RESCHEDULE', date: '2026-10-20' },
      'SCHEDULED',
    ],
    [
      'CT-T11 via API: aplicar uma dose atrasada',
      'crianca-penta-1',
      { type: 'APPLY', date: '2026-10-06' },
      'APPLIED',
    ],
    [
      'CT-T12 via API: cancelar uma dose atrasada',
      'crianca-penta-1',
      { type: 'CANCEL', confirmed: true },
      'CANCELLED',
    ],
  ] as const)('%s', async (_nome, ruleId, event, expected) => {
    const { app, dose } = await setup();
    const target = await dose(ruleId);
    const result = await app.doses.applyEvent(OWNER, target.id, event);
    expect(result).toMatchObject({ ok: true, value: { status: expected } });
    expect((await app.doses.get(OWNER, target.id)).ok).toBe(true);
  });

  test('CT-T06, T08 e T09 via API: dose agendada pode ser aplicada, desmarcada ou cancelada', async () => {
    const { app, dose } = await setup();
    const target = await dose('crianca-scr-1');
    const schedule = { type: 'SCHEDULE', date: '2026-10-10' } as const;

    await app.doses.applyEvent(OWNER, target.id, schedule);
    expect(await app.doses.applyEvent(OWNER, target.id, { type: 'UNSCHEDULE' })).toMatchObject({
      value: { status: 'PENDING', scheduledDate: null },
    });
    await app.doses.applyEvent(OWNER, target.id, schedule);
    expect(
      await app.doses.applyEvent(OWNER, target.id, { type: 'CANCEL', confirmed: true }),
    ).toMatchObject({ value: { status: 'CANCELLED' } });

    const second = await dose('crianca-scr-2');
    await app.doses.applyEvent(OWNER, second.id, { type: 'SCHEDULE', date: '2026-10-10' });
    expect(
      await app.doses.applyEvent(OWNER, second.id, { type: 'APPLY', date: '2026-10-06' }),
    ).toMatchObject({ value: { status: 'APPLIED', appliedDate: '2026-10-06' } });
  });

  test('CT-T07 via API: o agendamento vencido vira atrasado quando o dia passa', async () => {
    const { app, dose } = await setup();
    const target = await dose('crianca-scr-1');
    await app.doses.applyEvent(OWNER, target.id, { type: 'SCHEDULE', date: '2026-10-10' });
    expect((await app.doses.get(OWNER, target.id)).ok && (await dose('crianca-scr-1')).status).toBe(
      'SCHEDULED',
    );

    app.setNow('2026-10-11T15:00:00.000Z');
    expect(await app.doses.get(OWNER, target.id)).toMatchObject({
      ok: true,
      value: { status: 'OVERDUE', scheduledDate: '2026-10-10' },
    });
  });

  test('CT-API-V05: ação inválida devolve erro de transição e mantém o estado', async () => {
    const { app, dose } = await setup();
    const target = await dose('crianca-scr-1');
    await app.doses.applyEvent(OWNER, target.id, { type: 'APPLY', date: '2026-10-06' });
    const again = await app.doses.applyEvent(OWNER, target.id, {
      type: 'CANCEL',
      confirmed: true,
    });
    expect(again).toMatchObject({ ok: false, error: { code: 'INVALID_TRANSITION' } });
    expect(await app.doses.get(OWNER, target.id)).toMatchObject({ value: { status: 'APPLIED' } });
  });

  test.each([
    ['agendar no passado', 'crianca-scr-1', { type: 'SCHEDULE', date: '2026-10-05' }],
    ['aplicar no futuro', 'crianca-scr-1', { type: 'APPLY', date: '2026-10-07' }],
    ['cancelar sem confirmar', 'crianca-scr-1', { type: 'CANCEL', confirmed: false }],
  ] as const)('CT-API-V06: %s viola a regra', async (_nome, ruleId, event) => {
    const { app, dose } = await setup();
    const target = await dose(ruleId);
    expect(await app.doses.applyEvent(OWNER, target.id, event)).toMatchObject({
      ok: false,
      error: { code: 'GUARD_VIOLATION' },
    });
    expect((await dose(ruleId)).status).toBe('PENDING');
  });

  test('CT-API-V07: não altera dose de outro dono nem de membro inexistente', async () => {
    const { app, dose, memberId } = await setup();
    const target = await dose('crianca-scr-1');
    expect(
      await app.doses.applyEvent(OTHER_OWNER, target.id, { type: 'APPLY', date: '2026-10-06' }),
    ).toEqual({ ok: false, error: { code: 'NOT_FOUND' } });
    expect(await app.doses.applyEvent(OWNER, 'nao-existe', { type: 'UNSCHEDULE' })).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
    expect((await app.doses.listForMember(OTHER_OWNER, memberId)).ok).toBe(false);
  });

  test('CT-API-V08: dose de uma linha que saiu do calendário não é exibida', async () => {
    const { app, memberId, list } = await setup();
    await app.store.doses.saveMany(OWNER, [
      {
        id: 'orfa',
        memberId,
        ruleId: 'regra-que-nao-existe',
        status: 'PENDING',
        dueDate: '2026-10-01',
        scheduledDate: null,
        appliedDate: null,
      },
    ]);
    expect((await list()).items.some((d) => d.id === 'orfa')).toBe(false);
    expect(await app.doses.get(OWNER, 'orfa')).toEqual({ ok: false, error: { code: 'NOT_FOUND' } });
    expect(
      await app.doses.applyEvent(OWNER, 'orfa', { type: 'SCHEDULE', date: '2026-10-10' }),
    ).toMatchObject({
      ok: false,
    });
  });
});
