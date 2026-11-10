import { app } from '@azure/functions';
import type { HttpResponseInit, InvocationContext, Timer } from '@azure/functions';
import { withSecurityHeaders } from '../http';
import { calendarWatchHandlers, calendarWatchService } from './composition';

/** `GET /api/calendar/watch`: quando o calendário oficial foi conferido pela última vez. */
export async function getCalendarWatch(): Promise<HttpResponseInit> {
  return withSecurityHeaders(await calendarWatchHandlers.status());
}

/** `POST /api/calendar/watch/check`: confere agora. Exige a chave da função (uso do autor). */
export async function checkCalendarWatch(): Promise<HttpResponseInit> {
  return withSecurityHeaders(await calendarWatchHandlers.check());
}

/** Rotina semanal do vigia. Só contagens e ids de arquivo vão para o log. */
export async function runCalendarWatch(_timer: Timer, context: InvocationContext): Promise<void> {
  try {
    const summary = await calendarWatchService.check();
    context.log(
      `Vigia do calendário: ${summary.unchanged} iguais, ${summary.changed.length} diferentes (${summary.changed.join(', ') || 'nenhum'}), ${summary.failed} falhas, aviso ${summary.alerted ? 'enviado' : 'não enviado'}.`,
    );
  } catch (error) {
    context.error(
      `Falha na rotina do vigia do calendário (${error instanceof Error ? error.name : 'desconhecida'}).`,
    );
  }
}

app.http('getCalendarWatch', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'calendar/watch',
  handler: getCalendarWatch,
});

app.http('checkCalendarWatch', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'calendar/watch/check',
  handler: checkCalendarWatch,
});

/** Segunda-feira, 12h UTC (9h em Brasília): uma vez por semana basta para um calendário anual. */
app.timer('runCalendarWatch', {
  schedule: '0 0 12 * * 1',
  handler: runCalendarWatch,
});
