import { createHash, randomInt } from 'node:crypto';
import {
  formatInviteCode,
  generateInviteCode,
  normalizeInviteCode,
  type GuardianResponse,
  type HouseholdResponse,
  type InviteResponse,
  type JoinInput,
  type JoinResponse,
  type TransferInput,
} from '@vacina/shared';
import type { Clock } from '../clock';
import type {
  AuthRepository,
  ConsentRepository,
  HouseholdRepository,
  StoredHousehold,
} from '../repositories/repositories';
import type { RateLimiter, RateRule } from './assistant-ports';
import { failure, success, type Result } from './errors';
import { maskEmail } from './mask-email';

/** Quantos dias um convite vale. */
export const INVITE_VALID_DAYS = 7;

/** Quantos convites podem estar abertos ao mesmo tempo em uma família. */
export const MAX_ACTIVE_INVITES = 5;

/** Tentativas de entrar com um código por conta (ADR-010): limite por hora. */
const JOIN_RULE: RateRule = { name: 'household-join', limit: 10, windowSeconds: 60 * 60 };

/** Convites gerados por conta: limite por hora. */
const INVITE_RULE: RateRule = { name: 'household-invite', limit: 20, windowSeconds: 60 * 60 };

/** Casos de uso da família com vários responsáveis (ADR-029). */
export interface HouseholdService {
  /** A família de quem pergunta: responsáveis (e-mail oculto), papel e contagens. */
  get(accountId: string): Promise<Result<HouseholdResponse>>;
  /** O dono gera um convite; o código só aparece nesta resposta. */
  createInvite(accountId: string): Promise<Result<InviteResponse>>;
  /** O dono cancela os convites ainda não usados. */
  revokeInvites(accountId: string): Promise<Result<null>>;
  /** Entra numa família com o código de convite. */
  join(accountId: string, input: JoinInput): Promise<Result<JoinResponse>>;
  /** Sai da família (o dono precisa passar a propriedade antes). */
  leave(accountId: string): Promise<Result<null>>;
  /** O dono remove um responsável. */
  removeGuardian(accountId: string, guardianId: string): Promise<Result<null>>;
  /** O dono passa a propriedade a outro responsável. */
  transfer(accountId: string, input: TransferInput): Promise<Result<HouseholdResponse>>;
}

/** Dependências do serviço, todas injetadas para testar sem rede. */
export interface HouseholdServiceDeps {
  readonly households: HouseholdRepository;
  readonly consents: ConsentRepository;
  /** Só a leitura da conta, para mostrar o e-mail parcialmente oculto. */
  readonly accounts: Pick<AuthRepository, 'findAccountById'>;
  readonly clock: Clock;
  readonly limiter: RateLimiter;
  /** Sorteio seguro de 0 até `max - 1`; em produção, `crypto.randomInt`. */
  readonly random?: (max: number) => number;
}

/** Hash do código normalizado: é o que se guarda, nunca o código (como o token de redefinição). */
export function hashInviteCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/**
 * Cria os casos de uso da família. Toda operação exige que a conta tenha dado o consentimento
 * (RF09), e as regras de acesso vivem no repositório: aqui só se decide quem pode fazer o quê.
 *
 * @param deps - Repositórios, relógio, limitador e sorteio.
 */
export function createHouseholdService(deps: HouseholdServiceDeps): HouseholdService {
  const { households, consents, accounts, clock, limiter } = deps;
  const random = deps.random ?? randomInt;

  const present = (): Date => new Date(clock());

  async function toResponse(
    accountId: string,
    household: StoredHousehold,
  ): Promise<HouseholdResponse> {
    const guardians: GuardianResponse[] = [];
    for (const guardian of household.guardians) {
      const account = await accounts.findAccountById(guardian.accountId);
      guardians.push({
        id: guardian.id,
        role: guardian.role,
        emailHint: account ? maskEmail(account.email) : '***',
        joinedAt: guardian.joinedAt,
        isYou: guardian.accountId === accountId,
      });
    }
    const mine = household.guardians.find((g) => g.accountId === accountId);
    const role = mine?.role ?? 'GUARDIAN';
    return {
      role,
      guardians,
      memberCount: household.memberCount,
      // Só o dono gerencia convites; para o responsável a contagem não é informada.
      activeInvites:
        role === 'OWNER' ? await households.countActiveInvites(household.id, clock()) : 0,
    };
  }

  async function view(accountId: string): Promise<HouseholdResponse> {
    return toResponse(accountId, await households.get(accountId));
  }

  const needsConsent = async (accountId: string): Promise<boolean> =>
    (await consents.get(accountId)) === undefined;

  return {
    async get(accountId) {
      if (await needsConsent(accountId)) return failure({ code: 'CONSENT_REQUIRED' });
      return success(await view(accountId));
    },

    async createInvite(accountId) {
      if (await needsConsent(accountId)) return failure({ code: 'CONSENT_REQUIRED' });
      const household = await households.get(accountId);
      const mine = household.guardians.find((g) => g.accountId === accountId);
      if (mine?.role !== 'OWNER') return failure({ code: 'OWNER_ONLY' });

      const decision = await limiter.consume(accountId, [INVITE_RULE]);
      if (!decision.allowed) {
        return failure({
          code: 'RATE_LIMITED',
          scope: 'household',
          retryAfterSeconds: decision.retryAfterSeconds,
        });
      }
      if ((await households.countActiveInvites(household.id, clock())) >= MAX_ACTIVE_INVITES) {
        return failure({ code: 'LIMIT_REACHED', scope: 'invites' });
      }
      const code = generateInviteCode(random);
      const expires = present();
      expires.setUTCDate(expires.getUTCDate() + INVITE_VALID_DAYS);
      await households.createInvite({
        tokenHash: hashInviteCode(code),
        householdId: household.id,
        createdByAccountId: accountId,
        expiresAt: expires.toISOString(),
      });
      return success({ code: formatInviteCode(code), expiresAt: expires.toISOString() });
    },

    async revokeInvites(accountId) {
      if (await needsConsent(accountId)) return failure({ code: 'CONSENT_REQUIRED' });
      const household = await households.get(accountId);
      if (household.guardians.find((g) => g.accountId === accountId)?.role !== 'OWNER') {
        return failure({ code: 'OWNER_ONLY' });
      }
      await households.revokeInvites(household.id);
      return success(null);
    },

    async join(accountId, input) {
      if (await needsConsent(accountId)) return failure({ code: 'CONSENT_REQUIRED' });
      // O limite vem antes de qualquer conferência do código: chutar códigos também gasta tentativas.
      const decision = await limiter.consume(accountId, [JOIN_RULE]);
      if (!decision.allowed) {
        return failure({
          code: 'RATE_LIMITED',
          scope: 'household',
          retryAfterSeconds: decision.retryAfterSeconds,
        });
      }
      const code = normalizeInviteCode(input.code);
      if (code === null) return failure({ code: 'INVALID_INVITE' });
      const outcome = await households.join(
        accountId,
        hashInviteCode(code),
        clock(),
        input.moveMembers === true,
      );
      switch (outcome.status) {
        case 'INVALID':
          return failure({ code: 'INVALID_INVITE' });
        case 'ALREADY_MEMBER':
          return failure({ code: 'ALREADY_IN_HOUSEHOLD' });
        case 'NOT_ALONE':
          return failure({ code: 'NOT_ALONE' });
        case 'HAS_MEMBERS':
          return failure({ code: 'HOUSEHOLD_HAS_MEMBERS', memberCount: outcome.memberCount });
        case 'JOINED':
          return success({ household: await view(accountId), moved: outcome.moved });
      }
    },

    async leave(accountId) {
      if (await needsConsent(accountId)) return failure({ code: 'CONSENT_REQUIRED' });
      const outcome = await households.leave(accountId);
      if (outcome === 'OWNER_MUST_TRANSFER') return failure({ code: 'OWNER_MUST_TRANSFER' });
      // Quem está só não tem de quem sair.
      if (outcome === 'ALONE') return failure({ code: 'NOT_FOUND' });
      return success(null);
    },

    async removeGuardian(accountId, guardianId) {
      if (await needsConsent(accountId)) return failure({ code: 'CONSENT_REQUIRED' });
      const outcome = await households.remove(accountId, guardianId);
      if (outcome === 'FORBIDDEN') return failure({ code: 'OWNER_ONLY' });
      if (outcome === 'NOT_FOUND') return failure({ code: 'NOT_FOUND' });
      return success(null);
    },

    async transfer(accountId, input) {
      if (await needsConsent(accountId)) return failure({ code: 'CONSENT_REQUIRED' });
      const outcome = await households.transfer(accountId, input.guardianId);
      if (outcome === 'FORBIDDEN') return failure({ code: 'OWNER_ONLY' });
      if (outcome === 'NOT_FOUND') return failure({ code: 'NOT_FOUND' });
      return success(await view(accountId));
    },
  };
}
