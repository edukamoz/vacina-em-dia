import type {
  AuthSession,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '@vacina/shared';
import type { Clock } from '../clock';
import type { AuthRepository, StoredAccount } from '../repositories/repositories';
import type { RateLimiter } from './assistant-ports';
import type { EmailClient } from './email-ports';
import { failure, success, type Result } from './errors';
import { createFailureThrottle, throttleKey, type FailureThrottle } from './failure-throttle';
import type { PasswordHasher } from './password-hasher';
import { isWeakPassword } from './password-policy';
import { buildPasswordResetEmail, RESET_TOKEN_TTL_MINUTES } from './password-reset-email';
import type { TokenService } from './token-service';

/** De onde vem a requisição: usado só para limitar abusos; nunca é guardado nem registrado. */
export interface RequestOrigin {
  /** Endereço de rede de quem chamou (ou `desconhecido`). */
  readonly ip: string;
}

/** Casos de uso de cadastro e login (RF01, ADR-014). */
export interface AuthService {
  /** Cria a conta e já abre a sessão. */
  register(input: RegisterInput, origin: RequestOrigin): Promise<Result<AuthSession>>;
  /** Confere e-mail e senha e abre a sessão. */
  login(input: LoginInput, origin: RequestOrigin): Promise<Result<AuthSession>>;
  /** Troca um token de renovação por uma sessão nova (rotação: o antigo deixa de valer). */
  refresh(refreshToken: string): Promise<Result<AuthSession>>;
  /**
   * Pede a recuperação de senha. A resposta é a mesma exista a conta ou não (não revela quais
   * e-mails têm conta); se existir, envia o link por e-mail. Limitado por e-mail e por origem.
   */
  requestPasswordReset(input: ForgotPasswordInput, origin: RequestOrigin): Promise<Result<void>>;
  /** Cria a nova senha com o token do e-mail (uso único, validade de 1 hora) e encerra todas as sessões. */
  resetPassword(input: ResetPasswordInput): Promise<Result<void>>;
  /** Encerra a sessão revogando o token de renovação. Idempotente: nunca falha. */
  logout(refreshToken: string): Promise<void>;
  /** Devolve o id da conta dona do token de acesso, ou `undefined` se não for válido. */
  authenticate(accessToken: string): string | undefined;
  /** Dados públicos da conta; `undefined` se ela não existir mais. */
  describe(accountId: string): Promise<{ readonly id: string; readonly email: string } | undefined>;
}

/** Dependências do serviço de autenticação. */
export interface AuthServiceDeps {
  readonly accounts: AuthRepository;
  readonly hasher: PasswordHasher;
  readonly tokens: TokenService;
  readonly clock: Clock;
  readonly newId: () => string;
  /** Limita cadastros por origem. */
  readonly limiter: RateLimiter;
  /** Falhas de login por e-mail; por padrão 5 a cada 15 minutos. */
  readonly emailThrottle?: FailureThrottle;
  /** Falhas de login por origem; por padrão 20 a cada 15 minutos. */
  readonly ipThrottle?: FailureThrottle;
  /** Envio de e-mail (recuperação de senha). Sem ele, o pedido é aceito mas nada é enviado. */
  readonly email?: EmailClient;
  /** Endereço do app web, usado no link do e-mail. */
  readonly webBaseUrl?: string;
  /** Registra uma falha de envio de e-mail, só com o tipo (nunca endereço ou conteúdo). */
  readonly reportError?: (kind: string) => void;
  /** Máximo de contas; passou disso o cadastro é recusado. */
  readonly maxAccounts?: number;
  /** Quantas contas existem agora (para aplicar o máximo). */
  readonly countAccounts?: () => number;
}

const LOGIN_WINDOW_SECONDS = 15 * 60;
const RESET_EMAIL_RULE = { name: 'reset-email', limit: 3, windowSeconds: 60 * 60 } as const;
const RESET_IP_RULE = { name: 'reset-ip', limit: 10, windowSeconds: 60 * 60 } as const;
const REGISTER_RULE = { name: 'register', limit: 10, windowSeconds: 60 * 60 } as const;

/** Normaliza o e-mail: sem espaços nas pontas e em minúsculas. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Cria os casos de uso de autenticação. Regras de segurança (ADR-014): a senha só existe em memória
 * durante a chamada; conta inexistente e senha errada têm a mesma resposta e o mesmo custo de cálculo;
 * falhas repetidas bloqueiam por e-mail e por origem; o token de renovação é rotacionado e o reuso de
 * um token já usado revoga todos os da conta.
 *
 * @param deps - Repositório, hash, tokens, relógio e limites.
 */
export function createAuthService(deps: AuthServiceDeps): AuthService {
  const emailThrottle =
    deps.emailThrottle ?? createFailureThrottle(deps.clock, 5, LOGIN_WINDOW_SECONDS);
  const ipThrottle = deps.ipThrottle ?? createFailureThrottle(deps.clock, 20, LOGIN_WINDOW_SECONDS);
  // Hash de uma senha qualquer: dá às contas inexistentes o mesmo custo de uma conta real.
  const dummyHash = deps.hasher.hash('senha-que-nao-existe');

  async function openSession(account: StoredAccount): Promise<AuthSession> {
    const access = deps.tokens.signAccess(account.id);
    const refresh = deps.tokens.newRefreshToken();
    const expiresAt = new Date(
      Date.parse(deps.clock()) + deps.tokens.refreshTtlSeconds * 1000,
    ).toISOString();
    await deps.accounts.saveRefreshToken({
      tokenHash: refresh.hash,
      accountId: account.id,
      expiresAt,
    });
    return {
      accessToken: access.token,
      refreshToken: refresh.token,
      tokenType: 'Bearer',
      expiresIn: access.expiresIn,
      account: { id: account.id, email: account.email },
    };
  }

  return {
    async register(input, origin) {
      const decision = await deps.limiter.consume(`ip:${throttleKey(origin.ip)}`, [REGISTER_RULE]);
      if (!decision.allowed) {
        return failure({
          code: 'RATE_LIMITED',
          scope: 'register',
          retryAfterSeconds: decision.retryAfterSeconds,
        });
      }
      if (
        deps.maxAccounts !== undefined &&
        deps.countAccounts !== undefined &&
        deps.countAccounts() >= deps.maxAccounts
      ) {
        return failure({ code: 'AUTH_UNAVAILABLE' });
      }
      const email = normalizeEmail(input.email);
      if (isWeakPassword(input.password, email)) return failure({ code: 'WEAK_PASSWORD' });

      const account: StoredAccount = {
        id: deps.newId(),
        email,
        passwordHash: await deps.hasher.hash(input.password),
        createdAt: deps.clock(),
      };
      if (!(await deps.accounts.createAccount(account))) {
        return failure({ code: 'EMAIL_ALREADY_REGISTERED' });
      }
      return success(await openSession(account));
    },

    async login(input, origin) {
      const email = normalizeEmail(input.email);
      const emailKey = `email:${throttleKey(email)}`;
      const ipKey = `ip:${throttleKey(origin.ip)}`;
      const blocked = [emailThrottle.check(emailKey), ipThrottle.check(ipKey)].find(
        (state) => state.blocked,
      );
      if (blocked?.blocked) {
        return failure({
          code: 'RATE_LIMITED',
          scope: 'login',
          retryAfterSeconds: blocked.retryAfterSeconds,
        });
      }

      const account = await deps.accounts.findAccountByEmail(email);
      const valid = await deps.hasher.verify(
        input.password,
        account ? account.passwordHash : await dummyHash,
      );
      if (!account || !valid) {
        emailThrottle.fail(emailKey);
        ipThrottle.fail(ipKey);
        return failure({ code: 'INVALID_CREDENTIALS' });
      }
      emailThrottle.reset(emailKey);
      return success(await openSession(account));
    },

    async refresh(refreshToken) {
      const hash = deps.tokens.hashRefreshToken(refreshToken);
      const stored = await deps.accounts.findRefreshToken(hash);
      if (!stored) return failure({ code: 'INVALID_TOKEN' });
      const now = deps.clock();
      if (stored.revokedAt) {
        // Token já usado sendo apresentado de novo: pode ter sido roubado. Encerra todas as sessões.
        await deps.accounts.revokeAllRefreshTokens(stored.accountId, now);
        return failure({ code: 'INVALID_TOKEN' });
      }
      if (Date.parse(stored.expiresAt) <= Date.parse(now))
        return failure({ code: 'INVALID_TOKEN' });
      const account = await deps.accounts.findAccountById(stored.accountId);
      if (!account) return failure({ code: 'INVALID_TOKEN' });
      await deps.accounts.revokeRefreshToken(hash, now);
      return success(await openSession(account));
    },

    async requestPasswordReset(input, origin) {
      const email = normalizeEmail(input.email);
      const byEmail = await deps.limiter.consume(`email:${throttleKey(email)}`, [RESET_EMAIL_RULE]);
      const byIp = await deps.limiter.consume(`ip:${throttleKey(origin.ip)}`, [RESET_IP_RULE]);
      const limited = [byEmail, byIp].find((decision) => !decision.allowed);
      if (limited && !limited.allowed) {
        return failure({
          code: 'RATE_LIMITED',
          scope: 'reset',
          retryAfterSeconds: limited.retryAfterSeconds,
        });
      }

      const account = await deps.accounts.findAccountByEmail(email);
      if (!account || !deps.email || !deps.webBaseUrl) return success(undefined);
      const reset = deps.tokens.newRefreshToken();
      const expiresAt = new Date(
        Date.parse(deps.clock()) + RESET_TOKEN_TTL_MINUTES * 60 * 1000,
      ).toISOString();
      await deps.accounts.savePasswordResetToken({
        tokenHash: reset.hash,
        accountId: account.id,
        expiresAt,
      });
      try {
        await deps.email.send(buildPasswordResetEmail(account.email, deps.webBaseUrl, reset.token));
      } catch {
        // Não revela ao cliente (que existe conta); só o tipo da falha vai para o registro.
        deps.reportError?.('PASSWORD_RESET_EMAIL_FAILED');
      }
      return success(undefined);
    },

    async resetPassword(input) {
      const hash = deps.tokens.hashRefreshToken(input.token);
      const stored = await deps.accounts.findPasswordResetToken(hash);
      const now = deps.clock();
      if (!stored || stored.usedAt || Date.parse(stored.expiresAt) <= Date.parse(now)) {
        return failure({ code: 'INVALID_RESET_TOKEN' });
      }
      const account = await deps.accounts.findAccountById(stored.accountId);
      if (!account) return failure({ code: 'INVALID_RESET_TOKEN' });
      if (isWeakPassword(input.password, account.email)) return failure({ code: 'WEAK_PASSWORD' });
      // Uso único: só quem marcar o token primeiro continua (protege contra dois pedidos ao mesmo tempo).
      if (!(await deps.accounts.consumePasswordResetToken(hash, now))) {
        return failure({ code: 'INVALID_RESET_TOKEN' });
      }
      await deps.accounts.updatePasswordHash(account.id, await deps.hasher.hash(input.password));
      await deps.accounts.revokeAllRefreshTokens(account.id, now);
      emailThrottle.reset(`email:${throttleKey(account.email)}`);
      return success(undefined);
    },

    async logout(refreshToken) {
      await deps.accounts.revokeRefreshToken(
        deps.tokens.hashRefreshToken(refreshToken),
        deps.clock(),
      );
    },

    authenticate: (accessToken) => deps.tokens.verifyAccess(accessToken),

    async describe(accountId) {
      const account = await deps.accounts.findAccountById(accountId);
      return account ? { id: account.id, email: account.email } : undefined;
    },
  };
}
