import { app } from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext, Timer } from '@azure/functions';
import { authenticated, reminderHandlers, reminderService } from './composition';

/** `GET /api/reminders`: lembretes do usuário para hoje. */
export async function getReminders(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, (ownerId) => reminderHandlers.list(ownerId));
}

/** `PUT /api/reminders/preferences`: liga ou desliga os lembretes por e-mail. */
export async function setReminderPreferences(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, async (ownerId) => {
    const body: unknown = await request.json().catch(() => undefined);
    return reminderHandlers.setPreferences(ownerId, body);
  });
}

/** Rotina diária dos lembretes por e-mail. Só contagens vão para o log, nunca endereço ou nome. */
export async function sendDailyReminders(_timer: Timer, context: InvocationContext): Promise<void> {
  try {
    const summary = await reminderService.runDailyEmails();
    context.log(
      `Lembretes: ${summary.recipients} contas, ${summary.sent} enviados, ${summary.failed} falhas.`,
    );
  } catch (error) {
    context.error(
      `Falha na rotina de lembretes (${error instanceof Error ? error.name : 'desconhecida'}).`,
    );
  }
}

app.http('getReminders', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'reminders',
  handler: getReminders,
});

app.http('setReminderPreferences', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'reminders/preferences',
  handler: setReminderPreferences,
});

/** 11h UTC são 8h em Brasília (UTC-3, sem horário de verão). */
app.timer('sendDailyReminders', {
  schedule: '0 0 11 * * *',
  handler: sendDailyReminders,
});
