import { addDays, compareCivilDates, type CivilDate } from './civil-date';
import type { DoseSnapshot } from './dose-state';

/** Quantos dias antes da data o lembrete de dose próxima aparece (RF05). */
export const REMINDER_LEAD_DAYS = 7;

/** Tipo de lembrete: dose próxima, dose para hoje ou dose atrasada. */
export type ReminderKind = 'UPCOMING' | 'TODAY' | 'OVERDUE';

/**
 * Data que importa para o lembrete: a data agendada, quando a dose está Agendada, ou a data prevista.
 *
 * @param dose - Dose a avaliar.
 */
export function reminderDate(dose: DoseSnapshot): CivilDate {
  return dose.status === 'SCHEDULED' && dose.scheduledDate ? dose.scheduledDate : dose.dueDate;
}

/**
 * Diz se uma dose merece lembrete hoje no app: Atrasada; para hoje; ou com data nos próximos
 * {@link REMINDER_LEAD_DAYS} dias. Dose aplicada ou cancelada nunca gera lembrete, e uma dose
 * Pendente com data já passada que não atrasa (por regra do calendário) também não.
 *
 * @param dose - Dose a avaliar.
 * @param today - Data de hoje (recebida de fora, para a regra ficar pura).
 * @returns O tipo de lembrete, ou `null` quando não há o que lembrar.
 */
export function reminderKind(dose: DoseSnapshot, today: CivilDate): ReminderKind | null {
  if (dose.status === 'APPLIED' || dose.status === 'CANCELLED') return null;
  if (dose.status === 'OVERDUE') return 'OVERDUE';
  const date = reminderDate(dose);
  const order = compareCivilDates(date, today);
  if (order === 0) return 'TODAY';
  if (order > 0 && compareCivilDates(date, addDays(today, REMINDER_LEAD_DAYS)) <= 0) {
    return 'UPCOMING';
  }
  return null;
}

/**
 * Diz se o e-mail de lembrete deve citar esta dose hoje: Pendente ou Agendada, com data de hoje ou
 * daqui a exatamente {@link REMINDER_LEAD_DAYS} dias. Assim cada dose gera no máximo dois e-mails
 * (a semana antes e o próprio dia), em vez de um por dia.
 *
 * @param dose - Dose a avaliar.
 * @param today - Data de hoje.
 */
export function isEmailReminderDay(dose: DoseSnapshot, today: CivilDate): boolean {
  if (dose.status !== 'PENDING' && dose.status !== 'SCHEDULED') return false;
  const date = reminderDate(dose);
  return date === today || date === addDays(today, REMINDER_LEAD_DAYS);
}
