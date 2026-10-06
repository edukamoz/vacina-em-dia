import type { DoseStatus } from '@vacina/shared';
import type { FonteCalendario } from '../../components/aviso-fonte';

/** Dose de exemplo exibida no esqueleto do app (sem dados pessoais). */
export interface SampleDose {
  readonly id: string;
  readonly vaccine: string;
  readonly doseLabel: string;
  readonly status: DoseStatus;
  /** Data relevante ao estado (prevista, agendada ou aplicada), no formato `AAAA-MM-DD`. */
  readonly date: string;
}

/** Fonte do conjunto de exemplo: dados fictícios, nunca valores reais do PNI (CLAUDE.md, seção 8). */
export const SAMPLE_SOURCE: FonteCalendario = {
  nome: 'conjunto de exemplo do projeto (FICTITIOUS)',
  versao: '0.0-exemplo',
  ficticio: true,
};

/** Doses de exemplo, uma por estado, até a API de doses (SCRUM-18) e o calendário oficial entrarem. */
export const SAMPLE_DOSES: readonly SampleDose[] = [
  { id: 'ex-1', vaccine: 'Vacina de exemplo A', doseLabel: '1ª dose', status: 'APPLIED', date: '2026-03-10' },
  { id: 'ex-2', vaccine: 'Vacina de exemplo B', doseLabel: '2ª dose', status: 'OVERDUE', date: '2026-09-15' },
  { id: 'ex-3', vaccine: 'Vacina de exemplo C', doseLabel: 'Dose única', status: 'SCHEDULED', date: '2026-11-04' },
  { id: 'ex-4', vaccine: 'Vacina de exemplo D', doseLabel: 'Reforço', status: 'PENDING', date: '2027-01-20' },
  { id: 'ex-5', vaccine: 'Vacina de exemplo E', doseLabel: '1ª dose', status: 'CANCELLED', date: '2026-05-02' },
];
