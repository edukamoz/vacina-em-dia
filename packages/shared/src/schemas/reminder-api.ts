import { z } from 'zod';
import { civilDateSchema } from './dose';

/** Tipo de lembrete devolvido pela API. */
export const reminderKindSchema = z.enum(['UPCOMING', 'TODAY', 'OVERDUE']).meta({
  description:
    'UPCOMING: dose com data nos próximos 7 dias. TODAY: dose para hoje. OVERDUE: dose atrasada.',
});

/** Um lembrete: uma dose que merece atenção. */
export const reminderItemSchema = z
  .object({
    doseId: z.string().meta({ example: 'ex-2' }),
    memberId: z.string(),
    memberName: z.string().meta({ example: 'Ana' }),
    vaccine: z.string().meta({ example: 'Febre tifoide' }),
    doseLabel: z.string().meta({ example: '1ª dose' }),
    date: civilDateSchema.meta({ description: 'Data prevista ou agendada.' }),
    kind: reminderKindSchema,
  })
  .meta({ id: 'ReminderItem' });

/** Resposta de `GET /api/reminders`. */
export const reminderListResponseSchema = z
  .object({
    leadDays: z
      .number()
      .int()
      .meta({ example: 7, description: 'Antecedência dos avisos, em dias.' }),
    emailEnabled: z
      .boolean()
      .meta({ description: 'Se o usuário recebe lembretes por e-mail (ligado por padrão).' }),
    items: z.array(reminderItemSchema),
  })
  .meta({ id: 'ReminderList' });

/** Corpo de `PUT /api/reminders/preferences`. */
export const reminderPreferencesInputSchema = z
  .object({
    emailEnabled: z.boolean().meta({ description: 'Liga ou desliga os lembretes por e-mail.' }),
  })
  .strict()
  .meta({ id: 'ReminderPreferencesInput' });

/** Resposta de `PUT /api/reminders/preferences`. */
export const reminderPreferencesResponseSchema = z
  .object({ emailEnabled: z.boolean() })
  .meta({ id: 'ReminderPreferences' });

export type ReminderItem = z.infer<typeof reminderItemSchema>;
export type ReminderListResponse = z.infer<typeof reminderListResponseSchema>;
export type ReminderPreferencesInput = z.infer<typeof reminderPreferencesInputSchema>;
export type ReminderPreferencesResponse = z.infer<typeof reminderPreferencesResponseSchema>;
