import type { StoredDose } from '../repositories/dose-repository';

/** Fonte do conjunto de exemplo. Marcado como fictício até haver dado oficial do PNI (CLAUDE.md §8). */
export const SAMPLE_CALENDAR_SOURCE = {
  name: 'conjunto de exemplo do projeto (FICTITIOUS)',
  version: '0.0-exemplo',
  isFictitious: true,
  notice:
    'O aplicativo não substitui a caderneta oficial nem a orientação de profissionais de saúde.',
} as const;

/**
 * Doses de exemplo, uma por estado, sem dados pessoais e sem vacinas reais. O estado "Atrasada" é
 * gravado direto no seed porque a rotina de prazo ainda não existe (SCRUM-19).
 */
export function createSampleDoses(): readonly StoredDose[] {
  return [
    {
      id: 'ex-1',
      vaccine: 'Vacina de exemplo A',
      doseLabel: '1ª dose',
      status: 'APPLIED',
      dueDate: '2026-03-10',
      scheduledDate: null,
      appliedDate: '2026-03-10',
    },
    {
      id: 'ex-2',
      vaccine: 'Vacina de exemplo B',
      doseLabel: '2ª dose',
      status: 'OVERDUE',
      dueDate: '2026-09-15',
      scheduledDate: null,
      appliedDate: null,
    },
    {
      id: 'ex-3',
      vaccine: 'Vacina de exemplo C',
      doseLabel: 'Dose única',
      status: 'SCHEDULED',
      dueDate: '2026-10-30',
      scheduledDate: '2026-11-04',
      appliedDate: null,
    },
    {
      id: 'ex-4',
      vaccine: 'Vacina de exemplo D',
      doseLabel: 'Reforço',
      status: 'PENDING',
      dueDate: '2027-01-20',
      scheduledDate: null,
      appliedDate: null,
    },
    {
      id: 'ex-5',
      vaccine: 'Vacina de exemplo E',
      doseLabel: '1ª dose',
      status: 'CANCELLED',
      dueDate: '2026-05-02',
      scheduledDate: null,
      appliedDate: null,
    },
  ];
}
