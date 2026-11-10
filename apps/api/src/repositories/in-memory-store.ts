import { randomUUID } from 'node:crypto';
import type {
  AccountRepository,
  ConsentRepository,
  DoseRepository,
  HouseholdRepository,
  HouseholdRole,
  MemberRepository,
  ReminderRepository,
  StoredConsent,
  StoredDose,
  StoredGuardian,
  StoredInvite,
  StoredMember,
} from './repositories';

/** Quantidade máxima de donos guardados ao mesmo tempo; passou disso, o mais antigo é descartado. */
export const MAX_OWNERS = 500;

/** Dados que pertencem à conta (não à família). */
interface OwnerData {
  consent: StoredConsent | undefined;
  emailReminders: boolean;
}

interface InviteData extends StoredInvite {
  usedAt?: string;
}

/** Dados que pertencem à família: as pessoas, as doses, os responsáveis e os convites. */
interface FamilyData {
  readonly id: string;
  members: Map<string, StoredMember>;
  doses: Map<string, StoredDose>;
  guardians: StoredGuardian[];
  invites: Map<string, InviteData>;
}

/** Repositórios em memória que compartilham o mesmo armazenamento. */
export interface InMemoryStore {
  readonly members: MemberRepository;
  readonly doses: DoseRepository;
  readonly consents: ConsentRepository;
  readonly accounts: AccountRepository;
  readonly reminders: ReminderRepository;
  readonly households: HouseholdRepository;
}

/**
 * Cria os repositórios em memória. Os dados somem quando a API reinicia (uso de demonstração) e o
 * número de donos é limitado por {@link MAX_OWNERS}, para a memória não crescer sem limite.
 *
 * Cada conta pertence a uma família (ADR-029), criada na primeira vez que a conta grava ou consulta;
 * as pessoas e as doses ficam na família, e todo responsável as alcança.
 *
 * @param maxOwners - Limite de donos; por padrão {@link MAX_OWNERS}.
 * @param newId - Gerador de identificadores (família e vínculo), injetável para testar.
 * @param now - Instante atual em ISO 8601, para registrar quando a conta entrou na família.
 */
export function createInMemoryStore(
  maxOwners: number = MAX_OWNERS,
  newId: () => string = randomUUID,
  now: () => string = () => new Date().toISOString(),
): InMemoryStore {
  const owners = new Map<string, OwnerData>();
  const families = new Map<string, FamilyData>();
  const accountFamily = new Map<string, string>();

  const newFamily = (accountId: string, joinedAt: string): FamilyData => {
    const family: FamilyData = {
      id: newId(),
      members: new Map(),
      doses: new Map(),
      guardians: [{ id: newId(), accountId, role: 'OWNER', joinedAt }],
      invites: new Map(),
    };
    families.set(family.id, family);
    accountFamily.set(accountId, family.id);
    return family;
  };

  /** Tira a conta da família; apaga a família se ficou sem ninguém. */
  const detach = (accountId: string): void => {
    const family = familyOf(accountId);
    accountFamily.delete(accountId);
    if (!family) return;
    family.guardians = family.guardians.filter((g) => g.accountId !== accountId);
    if (family.guardians.length === 0) families.delete(family.id);
  };

  const familyOf = (accountId: string): FamilyData | undefined => {
    const id = accountFamily.get(accountId);
    return id === undefined ? undefined : families.get(id);
  };
  const ensureFamily = (accountId: string): FamilyData =>
    familyOf(accountId) ?? newFamily(accountId, now());

  const findOwner = (ownerId: string): OwnerData | undefined => owners.get(ownerId);
  const ensureOwner = (ownerId: string): OwnerData => {
    let data = owners.get(ownerId);
    if (!data) {
      if (owners.size >= maxOwners) {
        const oldest = owners.keys().next();
        if (!oldest.done) {
          owners.delete(oldest.value);
          detach(oldest.value);
        }
      }
      data = { consent: undefined, emailReminders: true };
      owners.set(ownerId, data);
    }
    return data;
  };

  const oldestFirst = (guardians: readonly StoredGuardian[]) =>
    [...guardians].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));

  /** Cria uma família nova e vazia para uma conta que acabou de sair da anterior. */
  const startOver = (accountId: string, joinedAt: string): void => {
    newFamily(accountId, joinedAt);
  };

  const households: HouseholdRepository = {
    async get(accountId) {
      const family = ensureFamily(accountId);
      return {
        id: family.id,
        guardians: oldestFirst(family.guardians),
        memberCount: family.members.size,
      };
    },
    async countActiveInvites(householdId, nowIso) {
      const family = families.get(householdId);
      if (!family) return 0;
      return [...family.invites.values()].filter((i) => !i.usedAt && i.expiresAt > nowIso).length;
    },
    async createInvite(invite) {
      families.get(invite.householdId)?.invites.set(invite.tokenHash, { ...invite });
    },
    async revokeInvites(householdId) {
      const family = families.get(householdId);
      if (!family) return;
      for (const [hash, invite] of family.invites) {
        if (!invite.usedAt) family.invites.delete(hash);
      }
    },
    async join(accountId, tokenHash, nowIso, moveMembers) {
      let target: FamilyData | undefined;
      let invite: InviteData | undefined;
      for (const family of families.values()) {
        const found = family.invites.get(tokenHash);
        if (found) {
          target = family;
          invite = found;
          break;
        }
      }
      if (!target || !invite || invite.usedAt || invite.expiresAt <= nowIso) {
        return { status: 'INVALID' };
      }
      const mine = ensureFamily(accountId);
      if (mine.id === target.id) return { status: 'ALREADY_MEMBER' };
      if (mine.guardians.length > 1) return { status: 'NOT_ALONE' };
      const count = mine.members.size;
      if (count > 0 && !moveMembers) return { status: 'HAS_MEMBERS', memberCount: count };

      invite.usedAt = nowIso;
      for (const [id, person] of mine.members) target.members.set(id, person);
      for (const [id, dose] of mine.doses) target.doses.set(id, dose);
      families.delete(mine.id);
      accountFamily.set(accountId, target.id);
      target.guardians.push({ id: newId(), accountId, role: 'GUARDIAN', joinedAt: nowIso });
      return { status: 'JOINED', moved: count };
    },
    async leave(accountId) {
      const family = ensureFamily(accountId);
      if (family.guardians.length === 1) return 'ALONE';
      const mine = family.guardians.find((g) => g.accountId === accountId);
      if (mine?.role === 'OWNER') return 'OWNER_MUST_TRANSFER';
      detach(accountId);
      startOver(accountId, now());
      return 'LEFT';
    },
    async remove(ownerAccountId, guardianId) {
      const family = ensureFamily(ownerAccountId);
      const me = family.guardians.find((g) => g.accountId === ownerAccountId);
      if (me?.role !== 'OWNER') return 'FORBIDDEN';
      const target = family.guardians.find((g) => g.id === guardianId);
      if (!target || target.accountId === ownerAccountId) return 'NOT_FOUND';
      detach(target.accountId);
      startOver(target.accountId, now());
      return 'REMOVED';
    },
    async transfer(ownerAccountId, guardianId) {
      const family = ensureFamily(ownerAccountId);
      const me = family.guardians.find((g) => g.accountId === ownerAccountId);
      if (me?.role !== 'OWNER') return 'FORBIDDEN';
      const target = family.guardians.find((g) => g.id === guardianId);
      if (!target || target.accountId === ownerAccountId) return 'NOT_FOUND';
      const role = (who: StoredGuardian): HouseholdRole =>
        who.id === target.id ? 'OWNER' : who.id === me.id ? 'GUARDIAN' : who.role;
      family.guardians = family.guardians.map((g) => ({ ...g, role: role(g) }));
      return 'TRANSFERRED';
    },
  };

  return {
    households,
    members: {
      list: async (ownerId) => [...(familyOf(ownerId)?.members.values() ?? [])],
      get: async (ownerId, id) => familyOf(ownerId)?.members.get(id),
      save: async (ownerId, member) => {
        ensureOwner(ownerId);
        ensureFamily(ownerId).members.set(member.id, member);
      },
      remove: async (ownerId, id) => {
        const family = familyOf(ownerId);
        if (!family) return;
        family.members.delete(id);
        for (const [doseId, dose] of family.doses) {
          if (dose.memberId === id) family.doses.delete(doseId);
        }
      },
    },
    doses: {
      listByMember: async (ownerId, memberId) =>
        [...(familyOf(ownerId)?.doses.values() ?? [])].filter((dose) => dose.memberId === memberId),
      get: async (ownerId, id) => familyOf(ownerId)?.doses.get(id),
      saveMany: async (ownerId, doses) => {
        ensureOwner(ownerId);
        const family = ensureFamily(ownerId);
        // Só se grava dose de pessoa da própria família.
        for (const dose of doses) {
          if (family.members.has(dose.memberId)) family.doses.set(dose.id, dose);
        }
      },
    },
    consents: {
      get: async (ownerId) => findOwner(ownerId)?.consent,
      save: async (ownerId, consent) => {
        ensureOwner(ownerId).consent = consent;
      },
    },
    // Sem banco não há como listar contas de todos os donos: a rotina diária fica sem candidatos, e
    // só a preferência é guardada (os e-mails reais dependem do Azure SQL).
    reminders: {
      getEmailEnabled: async (ownerId) => findOwner(ownerId)?.emailReminders ?? true,
      setEmailEnabled: async (ownerId, enabled) => {
        ensureOwner(ownerId).emailReminders = enabled;
      },
      listEmailCandidates: async () => [],
      claimEmailDay: async () => true,
      releaseEmailDay: async () => undefined,
    },
    accounts: {
      deleteAll: async (ownerId) => {
        const family = familyOf(ownerId);
        owners.delete(ownerId);
        if (!family) return;
        if (family.guardians.length > 1) {
          const me = family.guardians.find((g) => g.accountId === ownerId);
          const heir = oldestFirst(family.guardians).find((g) => g.accountId !== ownerId);
          if (me?.role === 'OWNER' && heir) {
            family.guardians = family.guardians.map((g) =>
              g.id === heir.id ? { ...g, role: 'OWNER' as const } : g,
            );
          }
          detach(ownerId);
          return;
        }
        families.delete(family.id);
        accountFamily.delete(ownerId);
      },
    },
  };
}
