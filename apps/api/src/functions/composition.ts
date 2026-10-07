import { randomUUID } from 'node:crypto';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { PNI_2026 } from '@vacina/shared';
import { createBrevoEmailClient, unavailableEmailClient } from '../clients/brevo-email-client';
import { createHttpNlpClient, unavailableNlpClient } from '../clients/nlp-http-client';
import { createHttpSpeechClient, unavailableSpeechClient } from '../clients/speech-http-client';
import { createAccountHandlers } from '../handlers/account';
import { createAssistantHandlers } from '../handlers/assistant';
import { createAuthHandlers, unavailableAuthHandlers } from '../handlers/auth';
import { createConsentHandlers } from '../handlers/consent';
import { createDoseHandlers } from '../handlers/doses';
import { internalErrorResult, unauthorizedResult } from '../handlers/http-errors';
import { createMemberHandlers } from '../handlers/members';
import { createReminderHandlers } from '../handlers/reminders';
import type { HttpResult } from '../http';
import { DEMO_SESSION_HEADER, resolveOwner } from '../identity';
import { createInMemoryAuthRepository, MAX_ACCOUNTS } from '../repositories/in-memory-auth';
import { createInMemoryStore } from '../repositories/in-memory-store';
import { createMssqlExecutor } from '../repositories/sql/mssql-executor';
import { createSqlRepositories } from '../repositories/sql/sql-repositories';
import { createAccountService } from '../services/account-service';
import { createAssistantService } from '../services/assistant-service';
import { createAuthService } from '../services/auth-service';
import { createConsentService } from '../services/consent-service';
import { createDoseService } from '../services/dose-service';
import { createMemberService } from '../services/member-service';
import { createReminderService } from '../services/reminder-service';
import { createScryptHasher } from '../services/password-hasher';
import { createFixedWindowLimiter } from '../services/rate-limiter';
import { createTokenService, MIN_SECRET_LENGTH } from '../services/token-service';

/**
 * Ponto de montagem (borda): cria o relógio real, o gerador de identificadores e liga repositórios,
 * serviços e handlers. É o único lugar que chama `new Date()` e `randomUUID()`; as regras os
 * recebem por injeção. Quando o banco entrar, só o `store` muda.
 */
const clock = () => new Date().toISOString();

/**
 * Persistência: com `SQL_SERVER` e `SQL_DATABASE`, tudo vai para o Azure SQL (autenticação Entra pela
 * identidade gerenciada, sem senha). Sem eles, os dados ficam em memória (desenvolvimento e testes).
 */
const sqlServer = process.env['SQL_SERVER'];
const sqlDatabase = process.env['SQL_DATABASE'];
const sql =
  sqlServer && sqlDatabase
    ? createSqlRepositories(createMssqlExecutor({ server: sqlServer, database: sqlDatabase }))
    : undefined;
const memory = sql ? undefined : createInMemoryStore();
const store = sql ?? (memory as ReturnType<typeof createInMemoryStore>);
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
const memoryAuth = sql ? undefined : createInMemoryAuthRepository();
const authRepository = sql?.auth ?? (memoryAuth as ReturnType<typeof createInMemoryAuthRepository>);
export const accountHandlers = createAccountHandlers(
  createAccountService(store.accounts, authRepository),
);

/**
 * Login próprio (ADR-014). A chave de assinatura do token vem de `AUTH_TOKEN_SECRET` (Key Vault);
 * sem ela, o login responde 503 em vez de usar uma chave padrão.
 */
const authSecret = process.env['AUTH_TOKEN_SECRET'];
const tokens =
  authSecret && authSecret.length >= MIN_SECRET_LENGTH
    ? createTokenService({ secret: authSecret, clock })
    : undefined;
/**
 * E-mail de recuperação de senha (Brevo): chave, remetente verificado e endereço do app web vêm do
 * ambiente. Sem eles, o pedido de recuperação é aceito mas nenhum e-mail sai.
 */
const brevoKey = process.env['BREVO_API_KEY'];
const senderEmail = process.env['EMAIL_SENDER_ADDRESS'];
const webBaseUrl = process.env['WEB_BASE_URL'];
const email =
  brevoKey && senderEmail
    ? createBrevoEmailClient({
        apiKey: brevoKey,
        senderEmail,
        senderName: process.env['EMAIL_SENDER_NAME'] ?? 'Vacina em Dia',
      })
    : unavailableEmailClient;
/** Lembretes (RF05): lista no app e rotina diária por e-mail (ADR-017). */
export const reminderService = createReminderService({
  members: store.members,
  doseService,
  reminders: store.reminders,
  email,
  clock,
  ...(webBaseUrl ? { webBaseUrl } : {}),
  reportError: (kind) => console.error(`Falha nos lembretes: ${kind}.`),
});
export const reminderHandlers = createReminderHandlers(reminderService);
const authService = tokens
  ? createAuthService({
      accounts: authRepository,
      hasher: createScryptHasher(),
      tokens,
      clock,
      newId: randomUUID,
      limiter: createFixedWindowLimiter(clock),
      email,
      ...(webBaseUrl ? { webBaseUrl } : {}),
      reportError: (kind) => console.error(`Falha: ${kind}.`),
      ...(memoryAuth ? { maxAccounts: MAX_ACCOUNTS, countAccounts: memoryAuth.size } : {}),
    })
  : undefined;
export const authHandlers = authService ? createAuthHandlers(authService) : unavailableAuthHandlers;

/** A sessão de demonstração vale até ser desligada com `DEMO_SESSION_ENABLED=false`. */
const demoEnabled = process.env['DEMO_SESSION_ENABLED'] !== 'false';

/** Endereço de rede de quem chamou (sem a porta); só serve para limitar abusos. */
export function originOf(request: HttpRequest): { ip: string } {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const ip = forwarded
    .replace(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/, '$1')
    .replace(/^\[(.+)\]:\d+$/, '$1');
  return { ip: ip.slice(0, 64) || 'desconhecido' };
}

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
 * token `Bearer` ou, se habilitado, pelo cabeçalho de demonstração (ver `identity.ts`) e responde 401 quando falta ou é inválido.
 */
export async function authenticated(
  request: HttpRequest,
  context: InvocationContext,
  run: (ownerId: string) => Promise<HttpResult>,
): Promise<HttpResponseInit> {
  return guarded(context, async () => {
    const ownerId = resolveOwner(
      {
        authorization: request.headers.get('authorization'),
        demoSession: request.headers.get(DEMO_SESSION_HEADER),
      },
      { authenticate: (token) => authService?.authenticate(token), demoEnabled },
    );
    return ownerId ? run(ownerId) : unauthorizedResult();
  });
}
