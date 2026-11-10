import type { HttpResult } from '../http';
import type { CalendarWatchService } from '../services/calendar-watch-service';

/** Handlers HTTP do vigia do calendário oficial (B72). */
export interface CalendarWatchHandlers {
  /** `GET /api/calendar/watch`: data da última verificação e se algum arquivo mudou. */
  status(): Promise<HttpResult>;
  /** `POST /api/calendar/watch/check`: roda a verificação agora (exige a chave da função). */
  check(): Promise<HttpResult>;
}

/**
 * Cria os handlers do vigia. A leitura é pública e traz só a data e um "mudou" (nenhum dado
 * pessoal); a verificação manual devolve só contagens e os ids dos arquivos.
 *
 * @param service - Casos de uso do vigia.
 */
export function createCalendarWatchHandlers(service: CalendarWatchService): CalendarWatchHandlers {
  return {
    async status() {
      return { status: 200, jsonBody: await service.status() };
    },
    async check() {
      return { status: 200, jsonBody: await service.check() };
    },
  };
}
