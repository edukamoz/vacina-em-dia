import type {
  CivilDate,
  DoseSnapshot,
  MemberKind,
  RecurrenceRule,
  Relationship,
  Species,
} from '@vacina/shared';

/** Membro guardado pelo repositório. */
export interface StoredMember {
  readonly id: string;
  readonly name: string;
  readonly birthDate: CivilDate;
  readonly isPregnant: boolean;
  /** Parentesco com o dono da conta; `null` se não foi informado. */
  readonly relationship: Relationship | null;
  /** Pessoa ou animal de estimação (B73). */
  readonly kind: MemberKind;
  /** Espécie do animal; `null` para pessoa. */
  readonly species: Species | null;
}

/** Dose guardada: a linha do calendário mais o estado da máquina de estados. */
export interface StoredDose extends DoseSnapshot {
  readonly id: string;
  readonly memberId: string;
  /** Linha do calendário oficial que originou a dose; `null` em dose avulsa. */
  readonly ruleId: string | null;
  /** Nome e dose informados pela pessoa; só em dose avulsa (`ruleId` nulo). */
  readonly custom?: { readonly vaccine: string; readonly doseLabel: string } | null;
  /** Regra de repetição; `null` ou ausente quando a dose não se repete (ou a série foi encerrada). */
  readonly recurrence?: RecurrenceRule | null;
  /** Identificador da série de doses que se repetem; ausente em dose que nunca se repetiu. */
  readonly seriesId?: string | null;
  /** Número desta dose na série (1 é a primeira). */
  readonly occurrence?: number | null;
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

/** Dose candidata ao e-mail de lembrete, com o endereço de quem a receberia. */
export interface ReminderCandidate {
  readonly accountId: string;
  readonly email: string;
  readonly dose: DoseSnapshot;
}

/** Preferência e controle de envio dos lembretes por e-mail (RF05). */
export interface ReminderRepository {
  /** Diz se a conta recebe lembretes por e-mail; ligado por padrão. */
  getEmailEnabled(ownerId: string): Promise<boolean>;
  /** Liga ou desliga os lembretes por e-mail da conta. */
  setEmailEnabled(ownerId: string, enabled: boolean): Promise<void>;
  /**
   * Doses Pendentes ou Agendadas, de contas com consentimento e lembretes ligados que ainda não
   * receberam e-mail em `today`, cuja data é hoje ou daqui a 7 dias. A rotina confere a regra.
   */
  listEmailCandidates(today: CivilDate): Promise<readonly ReminderCandidate[]>;
  /** Reserva o envio do dia; `false` se a conta já recebeu (ou está recebendo) em `today`. */
  claimEmailDay(accountId: string, today: CivilDate): Promise<boolean>;
  /** Devolve a reserva quando o envio falhou, para a próxima rotina tentar de novo. */
  releaseEmailDay(accountId: string, today: CivilDate): Promise<void>;
}

/** Papel de uma conta na família: o dono gerencia os acessos; o responsável vê e edita tudo. */
export type HouseholdRole = 'OWNER' | 'GUARDIAN';

/** Vínculo de uma conta com a família (ADR-029). */
export interface StoredGuardian {
  /** Identificador do vínculo; é o que a API mostra, nunca o identificador da conta. */
  readonly id: string;
  readonly accountId: string;
  readonly role: HouseholdRole;
  /** Quando a conta entrou na família (ISO 8601 em UTC). */
  readonly joinedAt: string;
}

/** A família de uma conta: os responsáveis, do mais antigo ao mais novo, e quantas pessoas tem. */
export interface StoredHousehold {
  readonly id: string;
  readonly guardians: readonly StoredGuardian[];
  readonly memberCount: number;
}

/** Convite guardado: só o hash do código, nunca o código. */
export interface StoredInvite {
  readonly tokenHash: string;
  readonly householdId: string;
  readonly createdByAccountId: string;
  /** Até quando vale (ISO 8601 em UTC). */
  readonly expiresAt: string;
}

/** Resultado de entrar numa família com um código. */
export type JoinOutcome =
  | { readonly status: 'JOINED'; readonly moved: number }
  /** Código que não existe, venceu ou já foi usado (a API não distingue os três). */
  | { readonly status: 'INVALID' }
  | { readonly status: 'ALREADY_MEMBER' }
  /** A conta divide a própria família com outros responsáveis: precisa sair antes. */
  | { readonly status: 'NOT_ALONE' }
  /** A conta tem pessoas cadastradas e não confirmou levá-las. */
  | { readonly status: 'HAS_MEMBERS'; readonly memberCount: number };

/** Resultado de sair da família. */
export type LeaveOutcome = 'LEFT' | 'OWNER_MUST_TRANSFER' | 'ALONE';

/** Resultado de remover um responsável. */
export type RemoveOutcome = 'REMOVED' | 'FORBIDDEN' | 'NOT_FOUND';

/** Resultado de passar a propriedade. */
export type TransferOutcome = 'TRANSFERRED' | 'FORBIDDEN' | 'NOT_FOUND';

/**
 * Acesso à família e aos convites (ADR-029). Toda conta pertence a exatamente uma família: a
 * primeira consulta cria a família própria, com a conta como dona. As pessoas e as doses pertencem à
 * família, então todo responsável as alcança (e só os responsáveis dela). Cada operação que muda
 * mais de uma linha é atômica.
 */
export interface HouseholdRepository {
  /** A família da conta; cria a família própria na primeira vez. */
  get(accountId: string): Promise<StoredHousehold>;
  /** Quantos convites da família ainda valem em `nowIso` (não usados e não vencidos). */
  countActiveInvites(householdId: string, nowIso: string): Promise<number>;
  /** Guarda um convite. */
  createInvite(invite: StoredInvite): Promise<void>;
  /** Apaga os convites ainda não usados da família. */
  revokeInvites(householdId: string): Promise<void>;
  /**
   * Entra na família do convite. Só entra quem é a única conta da própria família; as pessoas dela
   * só vão junto com `moveMembers`, e a família de origem, já vazia, é apagada. O código vale uma vez.
   */
  join(
    accountId: string,
    tokenHash: string,
    nowIso: string,
    moveMembers: boolean,
  ): Promise<JoinOutcome>;
  /** Sai da família: a conta ganha uma família nova e vazia e perde o acesso às pessoas. */
  leave(accountId: string): Promise<LeaveOutcome>;
  /** O dono remove um responsável da própria família; o removido ganha uma família nova e vazia. */
  remove(ownerAccountId: string, guardianId: string): Promise<RemoveOutcome>;
  /** O dono passa a propriedade a outro responsável da família (e vira responsável). */
  transfer(ownerAccountId: string, guardianId: string): Promise<TransferOutcome>;
}

/** Operações sobre a conta inteira. */
export interface AccountRepository {
  /**
   * Exclui os dados da conta (RF09). Se ela é a única da família, apaga tudo: pessoas, doses e
   * consentimento. Se divide a família, só sai dela e apaga o próprio consentimento: as pessoas
   * ficam com a família; se era a dona, a propriedade passa ao responsável mais antigo (ADR-029).
   */
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
