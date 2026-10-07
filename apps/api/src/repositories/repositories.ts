import type { CivilDate, DoseSnapshot, Relationship } from '@vacina/shared';

/** Membro guardado pelo repositório. */
export interface StoredMember {
  readonly id: string;
  readonly name: string;
  readonly birthDate: CivilDate;
  readonly isPregnant: boolean;
  /** Parentesco com o dono da conta; `null` se não foi informado. */
  readonly relationship: Relationship | null;
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

/** Conta de login guardada (ADR-014). O e-mail fica em minúsculas; a senha, só como hash. */
export interface StoredAccount {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly createdAt: string;
}

/** Token de renovação guardado: só o hash, nunca o valor entregue ao cliente. */
export interface StoredRefreshToken {
  readonly tokenHash: string;
  readonly accountId: string;
  readonly expiresAt: string;
  /** Quando foi usado ou revogado; presente significa que não vale mais. */
  readonly revokedAt?: string;
}

/** Token de redefinição de senha guardado: só o hash, nunca o valor enviado por e-mail. */
export interface StoredPasswordResetToken {
  readonly tokenHash: string;
  readonly accountId: string;
  readonly expiresAt: string;
  /** Quando foi usado; presente significa que não vale mais. */
  readonly usedAt?: string;
}

/** Acesso às contas de login e aos tokens de renovação. */
export interface AuthRepository {
  /** Cria a conta; `false` quando o e-mail já existe (a unicidade é do repositório, sem corrida). */
  createAccount(account: StoredAccount): Promise<boolean>;
  /** Busca a conta pelo e-mail em minúsculas. */
  findAccountByEmail(email: string): Promise<StoredAccount | undefined>;
  /** Busca a conta pelo identificador. */
  findAccountById(id: string): Promise<StoredAccount | undefined>;
  /** Guarda um token de renovação. */
  saveRefreshToken(token: StoredRefreshToken): Promise<void>;
  /** Busca um token de renovação pelo hash. */
  findRefreshToken(tokenHash: string): Promise<StoredRefreshToken | undefined>;
  /** Marca o token como usado ou revogado. */
  revokeRefreshToken(tokenHash: string, at: string): Promise<void>;
  /** Revoga todos os tokens da conta (reuso suspeito ou saída de todos os aparelhos). */
  revokeAllRefreshTokens(accountId: string, at: string): Promise<void>;
  /** Guarda um token de redefinição de senha. */
  savePasswordResetToken(token: StoredPasswordResetToken): Promise<void>;
  /** Busca um token de redefinição pelo hash. */
  findPasswordResetToken(tokenHash: string): Promise<StoredPasswordResetToken | undefined>;
  /** Marca o token como usado; `true` só para quem o usou primeiro (atômico, uso único). */
  consumePasswordResetToken(tokenHash: string, at: string): Promise<boolean>;
  /** Troca o hash da senha da conta. */
  updatePasswordHash(accountId: string, passwordHash: string): Promise<void>;
  /** Apaga a conta e os tokens dela (exclusão de conta, RF09). */
  deleteAccount(id: string): Promise<void>;
}
