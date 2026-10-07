import { reminderPreferencesInputSchema } from '@vacina/shared';
import type { HttpResult } from '../http';
import type { ReminderService } from '../services/reminder-service';
import { validationErrorResult } from './http-errors';
import { fieldsOf } from './validation';

/** Handlers HTTP dos lembretes (RF05). */
export interface ReminderHandlers {
  /** `GET /api/reminders`. */
  list(ownerId: string): Promise<HttpResult>;
  /** `PUT /api/reminders/preferences`. */
  setPreferences(ownerId: string, rawBody: unknown): Promise<HttpResult>;
}

/**
 * Cria os handlers dos lembretes.
 *
 * @param service - Casos de uso dos lembretes.
 */
export function createReminderHandlers(service: ReminderService): ReminderHandlers {
  return {
    async list(ownerId) {
      return { status: 200, jsonBody: await service.list(ownerId) };
    },

    async setPreferences(ownerId, rawBody) {
      const input = reminderPreferencesInputSchema.safeParse(rawBody);
      if (!input.success) return validationErrorResult(fieldsOf(input.error, 'body'));
      return {
        status: 200,
        jsonBody: await service.setEmailEnabled(ownerId, input.data.emailEnabled),
      };
    },
  };
}
