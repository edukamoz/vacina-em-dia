import type { CivilDate, DoseSnapshot } from '@vacina/shared';

/** Membro guardado pelo repositório. */
export interface StoredMember {
  readonly id: string;
  readonly name: string;
  readonly birthDate: CivilDate;
  readonly isPregnant: boolean;
}

/** Dose guardada: a linha do calendário mais o estado da máquina de estados. */
export interface StoredDose extends DoseSnapshot {
  readonly id: string;
  readonly memberId: string;
  /** Linha do calendário oficial que originou a dose. */
  readonly ruleId: string;
}

/** Consentimento guardado (RF09). */
export interface StoredConsent {
  readonly termVersion: string;
  readonly acceptedAt: string;
  readonly guardianDeclaration: boolean;
}

/**
 * Acesso aos membros. Todo método recebe o dono: um usuário nunca alcança dado de outro (CLAUDE.md
 * §10). O banco entra no SCRUM-22/15; a implementação em memória serve à demonstração.
 */
export interface MemberRepository {
  /** Lista os membros do dono, na ordem de cadastro. */
  list(ownerId: string): Promise<readonly StoredMember[]>;
  /** Busca um membro do dono; `undefined` quando não existe ou é de outro dono. */
  get(ownerId: string, id: string): Promise<StoredMember | undefined>;
  /** Grava (cria ou substitui) um membro do dono. */
  save(ownerId: string, member: StoredMember): Promise<void>;
  /** Remove o membro e, em cascata, as doses dele. */
  remove(ownerId: string, id: string): Promise<void>;
}

/** Acesso às doses, sempre limitado ao dono. */
export interface DoseRepository {
  /** Lista as doses de um membro do dono, na ordem em que foram geradas. */
  listByMember(ownerId: string, memberId: string): Promise<readonly StoredDose[]>;
  /** Busca uma dose do dono; `undefined` quando não existe ou é de outro dono. */
  get(ownerId: string, id: string): Promise<StoredDose | undefined>;
  /** Grava (cria ou substitui) doses do dono. */
  saveMany(ownerId: string, doses: readonly StoredDose[]): Promise<void>;
}

/** Acesso ao consentimento. */
export interface ConsentRepository {
  /** Busca o consentimento do dono; `undefined` se ainda não deu. */
  get(ownerId: string): Promise<StoredConsent | undefined>;
  /** Grava o consentimento do dono. */
  save(ownerId: string, consent: StoredConsent): Promise<void>;
}

/** Operações sobre a conta inteira. */
export interface AccountRepository {
  /** Apaga todos os dados do dono: membros, doses e consentimento (RF09). */
  deleteAll(ownerId: string): Promise<void>;
}
