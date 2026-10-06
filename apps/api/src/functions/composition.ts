import { randomUUID } from 'node:crypto';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { PNI_2026 } from '@vacina/shared';
import { createHttpNlpClient, unavailableNlpClient } from '../clients/nlp-http-client';
import { createHttpSpeechClient, unavailableSpeechClient } from '../clients/speech-http-client';
import { createAccountHandlers } from '../handlers/account';
import { createAssistantHandlers } from '../handlers/assistant';
import { createConsentHandlers } from '../handlers/consent';
import { createDoseHandlers } from '../handlers/doses';
import { internalErrorResult, unauthorizedResult } from '../handlers/http-errors';
import { createMemberHandlers } from '../handlers/members';
import type { HttpResult } from '../http';
import { DEMO_SESSION_HEADER, resolveDemoOwner } from '../identity';
import { createInMemoryStore } from '../repositories/in-memory-store';
import { createAccountService } from '../services/account-service';
import { createAssistantService } from '../services/assistant-service';
import { createConsentService } from '../services/consent-service';
import { createDoseService } from '../services/dose-service';
import { createMemberService } from '../services/member-service';
import { createFixedWindowLimiter } from '../services/rate-limiter';

/**
 * Ponto de montagem (borda): cria o relógio real, o gerador de identificadores e liga repositórios,
 * serviços e handlers. É o único lugar que chama `new Date()` e `randomUUID()`; as regras os
 * recebem por injeção. Quando o banco entrar, só o `store` muda.
 */
const clock = () => new Date().toISOString();
const store = createInMemoryStore();
const calendar = PNI_2026;

const doseService = createDoseService({
  members: store.members,
  doses: store.doses,
  clock,
  calendar,
});

export const memberHandlers = createMemberHandlers(
  createMemberService({
    members: store.members,
    doses: store.doses,
    consents: store.consents,
    clock,
    newId: randomUUID,
    calendar,
  }),
  doseService,
);
export const doseHandlers = createDoseHandlers(doseService);
export const consentHandlers = createConsentHandlers(
  createConsentService({ consents: store.consents, clock }),
);
export const accountHandlers = createAccountHandlers(createAccountService(store.accounts));

/**
 * Assistente: PLN e voz vêm de variáveis de ambiente (as chaves ficam no Key Vault, nunca no
 * repositório). Sem configuração, o assistente responde "indisponível" em vez de falhar.
 */
const env = process.env;
const nlp =
  env['NLP_BASE_URL'] && env['NLP_FUNCTION_KEY']
    ? createHttpNlpClient({ baseUrl: env['NLP_BASE_URL'], functionKey: env['NLP_FUNCTION_KEY'] })
    : unavailableNlpClient;
const speech =
  env['SPEECH_ENDPOINT'] && env['SPEECH_KEY']
    ? createHttpSpeechClient({ endpoint: env['SPEECH_ENDPOINT'], key: env['SPEECH_KEY'] })
    : unavailableSpeechClient;
export const assistantHandlers = createAssistantHandlers(
  createAssistantService({ nlp, speech, limiter: createFixedWindowLimiter(clock) }),
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

/**
 * Como {@link guarded}, mas só executa com uma sessão identificada: descobre o dono dos dados pelo
 * cabeçalho (ver `identity.ts`) e responde 401 quando falta ou é inválido.
 */
export async function authenticated(
  request: HttpRequest,
  context: InvocationContext,
  run: (ownerId: string) => Promise<HttpResult>,
): Promise<HttpResponseInit> {
  return guarded(context, async () => {
    const ownerId = resolveDemoOwner(request.headers.get(DEMO_SESSION_HEADER));
    return ownerId ? run(ownerId) : unauthorizedResult();
  });
}
