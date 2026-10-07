import type { DoseSnapshot } from './dose-state';
import { isEmailReminderDay, reminderKind } from './reminders';

const HOJE = '2026-10-06';
const dose = (patch: Partial<DoseSnapshot>): DoseSnapshot => ({
  status: 'PENDING',
  dueDate: HOJE,
  scheduledDate: null,
  appliedDate: null,
  ...patch,
});

describe('lembretes: tipo de aviso no app', () => {
  test.each([
    ['CT-LEM-01', dose({ dueDate: '2026-10-06' }), 'TODAY'],
    ['CT-LEM-02', dose({ dueDate: '2026-10-07' }), 'UPCOMING'],
    ['CT-LEM-03', dose({ dueDate: '2026-10-13' }), 'UPCOMING'],
    ['CT-LEM-04', dose({ dueDate: '2026-10-14' }), null],
    ['CT-LEM-05', dose({ dueDate: '2026-10-05' }), null],
    ['CT-LEM-06', dose({ status: 'OVERDUE', dueDate: '2026-09-01' }), 'OVERDUE'],
    ['CT-LEM-07', dose({ status: 'APPLIED', dueDate: '2026-10-06', appliedDate: HOJE }), null],
    ['CT-LEM-08', dose({ status: 'CANCELLED', dueDate: '2026-10-06' }), null],
    [
      'CT-LEM-09',
      dose({ status: 'SCHEDULED', dueDate: '2026-12-01', scheduledDate: '2026-10-08' }),
      'UPCOMING',
    ],
    [
      'CT-LEM-10',
      dose({ status: 'SCHEDULED', dueDate: '2026-10-06', scheduledDate: '2026-11-30' }),
      null,
    ],
  ] as const)('%s: classifica a dose', (_id, snapshot, esperado) => {
    expect(reminderKind(snapshot, HOJE)).toBe(esperado);
  });
});

describe('lembretes: dias de e-mail', () => {
  test.each([
    ['CT-LEM-11', dose({ dueDate: '2026-10-06' }), true],
    ['CT-LEM-12', dose({ dueDate: '2026-10-13' }), true],
    ['CT-LEM-13', dose({ dueDate: '2026-10-12' }), false],
    ['CT-LEM-14', dose({ dueDate: '2026-10-14' }), false],
    ['CT-LEM-15', dose({ status: 'OVERDUE', dueDate: '2026-10-06' }), false],
    ['CT-LEM-16', dose({ status: 'APPLIED', dueDate: '2026-10-06' }), false],
    ['CT-LEM-17', dose({ status: 'SCHEDULED', scheduledDate: '2026-10-13' }), true],
  ] as const)('%s: decide se entra no e-mail', (_id, snapshot, esperado) => {
    expect(isEmailReminderDay(snapshot, HOJE)).toBe(esperado);
  });
});
