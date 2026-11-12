import { addDays, compareCivilDates, type CivilDate } from './civil-date';
import type { DoseSnapshot } from './dose-state';

/** Quantos dias antes da data o lembrete de dose próxima aparece (RF05). */
export const REMINDER_LEAD_DAYS = 7;

/** Maior antecedência que a pessoa pode pedir para o aviso de uma dose. */
export const MAX_REMIND_DAYS_BEFORE = 60;

/** Quantos avisos antecipados diferentes a pessoa pode pedir para uma mesma dose. */
export const MAX_REMIND_DAYS_LIST = 8;

/** A parte da dose que diz quando avisar. */
export type AvisosDaDose = Pick<DoseSnapshot, 'remindDays' | 'remindDaysBefore'>;

/** Tipo de lembrete: dose próxima, dose para hoje ou dose atrasada. */
export type ReminderKind = 'UPCOMING' | 'TODAY' | 'OVERDUE';

/**
 * Quantos dias antes da data o aviso desta dose aparece: o valor escolhido pela pessoa ou, se ela
 * não escolheu, {@link REMINDER_LEAD_DAYS}.
 *
 * @param dose - Dose a avaliar.
 */
export function leadDaysOf(dose: AvisosDaDose): number {
  return Math.max(...leadDaysListOf(dose));
}

/**
 * Todas as antecedências escolhidas para a dose, da maior para a menor, sem repetir. Sem lista, vale
 * o aviso único (`remindDaysBefore`) e, sem ele, o padrão de {@link REMINDER_LEAD_DAYS}.
 *
 * @param dose - Dose a avaliar.
 */
export function leadDaysListOf(dose: AvisosDaDose): readonly number[] {
  const lista = dose.remindDays;
  const base = lista && lista.length > 0 ? lista : [dose.remindDaysBefore ?? REMINDER_LEAD_DAYS];
  return [...new Set(base)].sort((a, b) => b - a);
}

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
  if (order > 0 && compareCivilDates(date, addDays(today, leadDaysOf(dose))) <= 0) {
    return 'UPCOMING';
  }
  return null;
}

/**
 * Diz se o e-mail de lembrete deve citar esta dose hoje: Pendente ou Agendada, com data de hoje ou
 * daqui a exatamente uma das antecedências escolhidas (7 dias por padrão). Assim cada dose gera um
 * e-mail por aviso escolhido e mais um no próprio dia, em vez de um por dia.
 *
 * @param dose - Dose a avaliar.
 * @param today - Data de hoje.
 */
export function isEmailReminderDay(dose: DoseSnapshot, today: CivilDate): boolean {
  if (dose.status !== 'PENDING' && dose.status !== 'SCHEDULED') return false;
  const date = reminderDate(dose);
  return date === today || leadDaysListOf(dose).some((dias) => date === addDays(today, dias));
}
