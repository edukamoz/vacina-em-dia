import type { HttpResponseInit, InvocationContext } from '@azure/functions';
import { createDoseHandlers } from '../handlers/doses';
import { internalErrorResult } from '../handlers/http-errors';
import type { HttpResult } from '../http';
import { createInMemoryDoseRepository } from '../repositories/in-memory-dose-repository';
import { SAMPLE_CALENDAR_SOURCE, createSampleDoses } from '../seed/sample-doses';
import { createDoseService } from '../services/dose-service';

/**
 * Ponto de montagem (borda): cria o relógio real e liga repositório, serviço e handlers. É o único
 * lugar que chama `new Date()`; as regras recebem o relógio por injeção.
 */
export const doseHandlers = createDoseHandlers(
  createDoseService({
    repository: createInMemoryDoseRepository(createSampleDoses()),
    clock: () => new Date().toISOString(),
    source: SAMPLE_CALENDAR_SOURCE,
  }),
);

/**
 * Executa um handler e garante que uma falha inesperada vire HTTP 500 genérico. Só o tipo do erro
 * vai para o log, porque a mensagem poderia conter dado pessoal.
 */
export async function guarded(
  context: InvocationContext,
  run: () => Promise<HttpResult>,
): Promise<HttpResponseInit> {
  try {
    return await run();
  } catch (error) {
    context.error(`Falha inesperada (${error instanceof Error ? error.name : 'desconhecida'}).`);
    return internalErrorResult();
  }
}
