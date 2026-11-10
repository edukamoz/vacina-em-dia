import { z } from 'zod';

/** Resposta de `GET /api/calendar/watch`: a conferência do calendário oficial (B72, ADR-030). */
export const calendarWatchStatusSchema = z.object({
  checkedAt: z.string().nullable().meta({
    example: '2026-11-16T12:00:00.000Z',
    description: 'Instante da última conferência com o portal do Ministério, ou nulo.',
  }),
  changed: z.boolean().meta({
    description:
      'Verdadeiro quando algum arquivo oficial difere do que o app transcreveu (conferência pendente).',
  }),
});

/** Estado do vigia do calendário oficial. */
export type CalendarWatchStatus = z.infer<typeof calendarWatchStatusSchema>;
