import type {
  AccountRepository,
  ConsentRepository,
  DoseRepository,
  MemberRepository,
  StoredConsent,
  StoredDose,
  StoredMember,
} from './repositories';

/** Quantidade máxima de donos guardados ao mesmo tempo; passou disso, o mais antigo é descartado. */
export const MAX_OWNERS = 500;

interface OwnerData {
  members: Map<string, StoredMember>;
  doses: Map<string, StoredDose>;
  consent: StoredConsent | undefined;
}

/** Repositórios em memória que compartilham o mesmo armazenamento. */
export interface InMemoryStore {
  readonly members: MemberRepository;
  readonly doses: DoseRepository;
  readonly consents: ConsentRepository;
  readonly accounts: AccountRepository;
}

/**
 * Cria os repositórios em memória. Os dados somem quando a API reinicia (uso de demonstração) e o
 * número de donos é limitado por {@link MAX_OWNERS}, para a memória não crescer sem limite.
 *
 * @param maxOwners - Limite de donos; por padrão {@link MAX_OWNERS}.
 */
export function createInMemoryStore(maxOwners: number = MAX_OWNERS): InMemoryStore {
  const owners = new Map<string, OwnerData>();

  const find = (ownerId: string): OwnerData | undefined => owners.get(ownerId);
  const ensure = (ownerId: string): OwnerData => {
    let data = owners.get(ownerId);
    if (!data) {
      if (owners.size >= maxOwners) {
        const oldest = owners.keys().next();
        if (!oldest.done) owners.delete(oldest.value);
      }
      data = { members: new Map(), doses: new Map(), consent: undefined };
      owners.set(ownerId, data);
    }
    return data;
  };

  return {
    members: {
      list: async (ownerId) => [...(find(ownerId)?.members.values() ?? [])],
      get: async (ownerId, id) => find(ownerId)?.members.get(id),
      save: async (ownerId, member) => {
        ensure(ownerId).members.set(member.id, member);
      },
      remove: async (ownerId, id) => {
        const data = find(ownerId);
        if (!data) return;
        data.members.delete(id);
        for (const [doseId, dose] of data.doses) {
          if (dose.memberId === id) data.doses.delete(doseId);
        }
      },
    },
    doses: {
      listByMember: async (ownerId, memberId) =>
        [...(find(ownerId)?.doses.values() ?? [])].filter((dose) => dose.memberId === memberId),
      get: async (ownerId, id) => find(ownerId)?.doses.get(id),
      saveMany: async (ownerId, doses) => {
        const data = ensure(ownerId);
        for (const dose of doses) data.doses.set(dose.id, dose);
      },
    },
    consents: {
      get: async (ownerId) => find(ownerId)?.consent,
      save: async (ownerId, consent) => {
        ensure(ownerId).consent = consent;
      },
    },
    accounts: {
      deleteAll: async (ownerId) => {
        owners.delete(ownerId);
      },
    },
  };
}
