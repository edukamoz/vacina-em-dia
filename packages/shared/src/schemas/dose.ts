import { z } from 'zod';
import { DOSE_STATUSES, isValidCivilDate } from '../domain';

/** Esquema de data civil (`AAAA-MM-DD`), conferindo que a data existe no calendário. */
export const civilDateSchema = z.string().refine(isValidCivilDate, {
  message: 'Informe uma data válida no formato AAAA-MM-DD.',
});

/** Esquema do estado de uma dose. */
export const doseStatusSchema = z.enum(DOSE_STATUSES);

/**
 * Esquema do corpo de uma requisição que muda o estado de uma dose. Toda entrada externa passa por
 * ele antes de chegar à regra de negócio (CLAUDE.md §7).
 */
export const doseEventInputSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('SCHEDULE'), date: civilDateSchema }),
  z.object({ type: z.literal('UNSCHEDULE') }),
  z.object({ type: z.literal('RESCHEDULE'), date: civilDateSchema }),
  z.object({ type: z.literal('APPLY'), date: civilDateSchema }),
  z.object({ type: z.literal('CANCEL'), confirmed: z.boolean() }),
]);

/** Corpo validado de uma requisição de mudança de estado. O cliente nunca envia `MARK_OVERDUE`. */
export type DoseEventInput = z.infer<typeof doseEventInputSchema>;
