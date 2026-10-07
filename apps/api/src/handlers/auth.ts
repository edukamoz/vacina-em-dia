import {
  forgotPasswordInputSchema,
  loginInputSchema,
  refreshInputSchema,
  registerInputSchema,
  resetPasswordInputSchema,
  type AuthSession,
} from '@vacina/shared';
import type { HttpResult } from '../http';
import type { AuthService, RequestOrigin } from '../services/auth-service';
import type { Result } from '../services/errors';
import { toErrorResult, unauthorizedResult, validationErrorResult } from './http-errors';
import { fieldsOf } from './validation';

/** Handlers HTTP do cadastro e do login (RF01). */
export interface AuthHandlers {
  /** `POST /api/auth/register`. */
  register(origin: RequestOrigin, body: unknown): Promise<HttpResult>;
  /** `POST /api/auth/login`. */
  login(origin: RequestOrigin, body: unknown): Promise<HttpResult>;
  /** `POST /api/auth/refresh`. */
  refresh(body: unknown): Promise<HttpResult>;
  /** `POST /api/auth/logout`. */
  logout(body: unknown): Promise<HttpResult>;
  /** `POST /api/auth/forgot-password`: pede o e-mail de recuperação (sempre 202). */
  forgotPassword(origin: RequestOrigin, body: unknown): Promise<HttpResult>;
  /** `POST /api/auth/reset-password`: cria a nova senha com o token do e-mail. */
  resetPassword(body: unknown): Promise<HttpResult>;
  /** `GET /api/auth/me`: dados da conta da sessão atual. */
  me(accountId: string): Promise<HttpResult>;
}

function sessionResult(result: Result<AuthSession>, status: number): HttpResult {
  return result.ok
    ? { status, jsonBody: result.value, headers: { 'cache-control': 'no-store' } }
    : toErrorResult(result.error);
}

/**
 * Cria os handlers de autenticação: validam o corpo com o esquema do pacote compartilhado e
 * delegam ao serviço. As respostas com tokens levam `Cache-Control: no-store`.
 *
 * @param service - Casos de uso de autenticação.
 */
export function createAuthHandlers(service: AuthService): AuthHandlers {
  return {
    async register(origin, body) {
      const parsed = registerInputSchema.safeParse(body);
      if (!parsed.success) return validationErrorResult(fieldsOf(parsed.error, 'body'));
      return sessionResult(await service.register(parsed.data, origin), 201);
    },
    async login(origin, body) {
      const parsed = loginInputSchema.safeParse(body);
      if (!parsed.success) return validationErrorResult(fieldsOf(parsed.error, 'body'));
      return sessionResult(await service.login(parsed.data, origin), 200);
    },
    async refresh(body) {
      const parsed = refreshInputSchema.safeParse(body);
      if (!parsed.success) return validationErrorResult(fieldsOf(parsed.error, 'body'));
      return sessionResult(await service.refresh(parsed.data.refreshToken), 200);
    },
    async logout(body) {
      const parsed = refreshInputSchema.safeParse(body);
      if (!parsed.success) return validationErrorResult(fieldsOf(parsed.error, 'body'));
      await service.logout(parsed.data.refreshToken);
      return { status: 204 };
    },
    async forgotPassword(origin, body) {
      const parsed = forgotPasswordInputSchema.safeParse(body);
      if (!parsed.success) return validationErrorResult(fieldsOf(parsed.error, 'body'));
      const result = await service.requestPasswordReset(parsed.data, origin);
      return result.ok ? { status: 202 } : toErrorResult(result.error);
    },
    async resetPassword(body) {
      const parsed = resetPasswordInputSchema.safeParse(body);
      if (!parsed.success) return validationErrorResult(fieldsOf(parsed.error, 'body'));
      const result = await service.resetPassword(parsed.data);
      return result.ok ? { status: 204 } : toErrorResult(result.error);
    },
    async me(accountId) {
      const account = await service.describe(accountId);
      return account ? { status: 200, jsonBody: account } : unauthorizedResult();
    },
  };
}

/** Handlers usados quando o login não está configurado: tudo responde 503 sem detalhe. */
export const unavailableAuthHandlers: AuthHandlers = {
  register: async () => toErrorResult({ code: 'AUTH_UNAVAILABLE' }),
  login: async () => toErrorResult({ code: 'AUTH_UNAVAILABLE' }),
  refresh: async () => toErrorResult({ code: 'AUTH_UNAVAILABLE' }),
  forgotPassword: async () => toErrorResult({ code: 'AUTH_UNAVAILABLE' }),
  resetPassword: async () => toErrorResult({ code: 'AUTH_UNAVAILABLE' }),
  logout: async () => ({ status: 204 }),
  me: async () => unauthorizedResult(),
};
