import { createInMemoryDoseRepository } from '../repositories/in-memory-dose-repository';
import { SAMPLE_CALENDAR_SOURCE, createSampleDoses } from '../seed/sample-doses';
import { createDoseService } from './dose-service';

const NOW = '2026-10-06T15:00:00.000Z'; // hoje (civil): 2026-10-06
const build = () =>
  createDoseService({
    repository: createInMemoryDoseRepository(createSampleDoses()),
    clock: () => NOW,
    source: SAMPLE_CALENDAR_SOURCE,
  });

describe('serviço de doses', () => {
  test('CT-API-V01: lista as doses com a fonte do calendário', async () => {
    const result = await build().listDoses();
    expect(result.items).toHaveLength(5);
    expect(result.source.isFictitious).toBe(true);
  });

  test('CT-API-V02: busca uma dose e informa quando não existe', async () => {
    const service = build();
    expect(await service.getDose('ex-2')).toMatchObject({ ok: true });
    expect(await service.getDose('nao-existe')).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
  });

  test.each([
    [
      'CT-T03 via API: aplicar uma dose pendente',
      'ex-4',
      { type: 'APPLY', date: '2026-10-06' },
      'APPLIED',
    ],
    [
      'CT-T02 via API: agendar uma dose pendente',
      'ex-4',
      { type: 'SCHEDULE', date: '2026-10-06' },
      'SCHEDULED',
    ],
    [
      'CT-T10 via API: reagendar uma dose atrasada',
      'ex-2',
      { type: 'RESCHEDULE', date: '2026-10-20' },
      'SCHEDULED',
    ],
    [
      'CT-T09 via API: cancelar uma dose agendada',
      'ex-3',
      { type: 'CANCEL', confirmed: true },
      'CANCELLED',
    ],
    ['CT-T08 via API: desmarcar o agendamento', 'ex-3', { type: 'UNSCHEDULE' }, 'PENDING'],
  ] as const)('%s', async (_nome, id, event, expected) => {
    const service = build();
    const result = await service.applyEvent(id, event);
    expect(result).toMatchObject({ ok: true, dose: { status: expected } });
    expect(await service.getDose(id)).toMatchObject({ ok: true, dose: { status: expected } });
  });

  test('CT-API-V03: transição inválida devolve INVALID_TRANSITION e mantém o estado', async () => {
    const service = build();
    const result = await service.applyEvent('ex-1', { type: 'CANCEL', confirmed: true });
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_TRANSITION' } });
    expect(await service.getDose('ex-1')).toMatchObject({ dose: { status: 'APPLIED' } });
  });

  test.each([
    ['agendar no passado', 'ex-4', { type: 'SCHEDULE', date: '2026-10-05' }, 'DATE_IN_PAST'],
    ['aplicar no futuro', 'ex-4', { type: 'APPLY', date: '2026-10-07' }, 'DATE_IN_FUTURE'],
    [
      'cancelar sem confirmar',
      'ex-4',
      { type: 'CANCEL', confirmed: false },
      'CONFIRMATION_REQUIRED',
    ],
  ] as const)('CT-API-V04: %s viola a regra', async (_nome, id, event, reason) => {
    const service = build();
    const result = await service.applyEvent(id, event);
    expect(result).toMatchObject({ ok: false, error: { code: 'GUARD_VIOLATION', reason } });
    expect(await service.getDose(id)).toMatchObject({ dose: { status: 'PENDING' } });
  });

  test('CT-API-V05: evento em dose inexistente devolve NOT_FOUND', async () => {
    expect(await build().applyEvent('zzz', { type: 'UNSCHEDULE' })).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
  });

  test('CT-API-V06: usa o dia civil de Brasília para validar datas', async () => {
    const service = createDoseService({
      repository: createInMemoryDoseRepository(createSampleDoses()),
      clock: () => '2026-10-07T02:30:00.000Z', // ainda é 06/10 em Brasília
      source: SAMPLE_CALENDAR_SOURCE,
    });
    expect(await service.applyEvent('ex-4', { type: 'APPLY', date: '2026-10-06' })).toMatchObject({
      ok: true,
    });
    expect(await service.applyEvent('ex-3', { type: 'APPLY', date: '2026-10-07' })).toMatchObject({
      ok: false,
      error: { reason: 'DATE_IN_FUTURE' },
    });
  });
});
