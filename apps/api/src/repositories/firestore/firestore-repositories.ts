import { randomUUID } from 'node:crypto';
import type {
  DocumentData,
  DocumentReference,
  Firestore,
  Transaction,
} from '@google-cloud/firestore';
import { MAX_REMIND_DAYS_BEFORE, addDays, type CivilDate, type DoseStatus } from '@vacina/shared';
import type {
  AccountRepository,
  AuthRepository,
  ConsentRepository,
  DoseRepository,
  HouseholdRepository,
  HouseholdRole,
  JoinOutcome,
  LeaveOutcome,
  MemberRepository,
  RemoveOutcome,
  ReminderCandidate,
  ReminderRepository,
  StoredAccount,
  StoredConsent,
  StoredDose,
  StoredHousehold,
  StoredInvite,
  StoredMember,
  StoredPasswordResetToken,
  StoredRefreshToken,
  TransferOutcome,
} from '../repositories';

/**
 * Repositórios sobre o Firestore (plano de contingência no Google Cloud, ADR-035). Têm o mesmo
 * comportamento dos repositórios em memória e do Azure SQL: a mesma bateria de testes de contrato
 * roda nos três (`repositories.contract.test.ts`, com o emulador do Firestore).
 */
export interface FirestoreRepositories {
  readonly members: MemberRepository;
  readonly doses: DoseRepository;
  readonly consents: ConsentRepository;
  readonly accounts: AccountRepository;
  readonly reminders: ReminderRepository;
  readonly households: HouseholdRepository;
  readonly auth: AuthRepository;
  /** Leitura mínima que confirma que o banco responde. */
  readonly ping: () => Promise<void>;
}

/** Nomes das coleções (com o prefixo, que isola os testes uns dos outros). */
const C = {
  accounts: 'accounts',
  emails: 'emails',
  refresh: 'refreshTokens',
  reset: 'resetTokens',
  households: 'households',
  memberships: 'memberships',
  members: 'members',
  doses: 'doses',
  consents: 'consents',
  reminderLog: 'reminderLog',
  invites: 'invites',
  ping: 'ping',
} as const;

/** Código gRPC de "documento já existe". */
const ALREADY_EXISTS = 6;

let ultimaSequencia = 0;
/**
 * Número crescente que guarda a ordem de cadastro (o SQL usa uma coluna de identidade). Parte do
 * relógio, para continuar crescendo entre instâncias, e nunca repete dentro do mesmo processo.
 */
function proximaSequencia(): number {
  ultimaSequencia = Math.max(ultimaSequencia + 1, Date.now() * 1000);
  return ultimaSequencia;
}

/** Remove os campos internos (`seq`, `householdId`) e devolve o que o repositório guardou. */
function semInternos<T>(dados: DocumentData, internos: readonly string[]): T {
  const copia: DocumentData = { ...dados };
  for (const chave of internos) delete copia[chave];
  return copia as T;
}

/** Vínculo da conta com a família, como guardado (o documento tem o id da conta como chave). */
interface Vinculo {
  readonly id: string;
  readonly householdId: string;
  readonly role: HouseholdRole;
  readonly joinedAt: string;
}

/**
 * Cria os repositórios sobre o Firestore. O "dono" que chega a cada método é uma conta, e o acesso
 * passa sempre pelo vínculo dela com a família: uma pessoa só é alcançada pelas contas da família
 * dela, e uma dose só é alcançada pela pessoa (ADR-029; CLAUDE.md §10). Todas as consultas usam um
 * único filtro de igualdade e ordenam em memória, para não exigir índices compostos.
 *
 * @param db - Cliente do Firestore (em teste, apontado para o emulador).
 * @param options.prefix - Prefixo das coleções (isola testes e ambientes).
 * @param options.newId - Gerador de identificadores, injetável para testar.
 * @param options.now - Relógio (ISO 8601), injetável para testar.
 */
export function createFirestoreRepositories(
  db: Firestore,
  options: { prefix?: string; newId?: () => string; now?: () => string } = {},
): FirestoreRepositories {
  const prefix = options.prefix ?? '';
  const newId = options.newId ?? randomUUID;
  const now = options.now ?? (() => new Date().toISOString());
  const col = (nome: string) => db.collection(`${prefix}${nome}`);
  const ref = (nome: string, id: string) => col(nome).doc(id);

  // ---- Família: apoio ----

  /**
   * Lê o vínculo da conta dentro da transação. Sem vínculo, planeja criar a família própria (a
   * escrita só acontece em `aplicar`, porque a transação exige todas as leituras antes das escritas).
   */
  async function vinculoDe(tx: Transaction, accountId: string) {
    const doc = await tx.get(ref(C.memberships, accountId));
    const escritas: Array<() => void> = [];
    if (doc.exists) {
      return { vinculo: doc.data() as Vinculo, escritas };
    }
    const vinculo: Vinculo = {
      id: newId(),
      householdId: newId(),
      role: 'OWNER',
      joinedAt: now(),
    };
    escritas.push(
      () => tx.set(ref(C.households, vinculo.householdId), { createdAt: vinculo.joinedAt }),
      () => tx.set(ref(C.memberships, accountId), vinculo),
    );
    return { vinculo, escritas };
  }

  /** Planeja criar uma família nova e vazia, com a conta como dona (depois de sair ou ser removida). */
  function recomecar(tx: Transaction, accountId: string): void {
    const familia = newId();
    const vinculo: Vinculo = { id: newId(), householdId: familia, role: 'OWNER', joinedAt: now() };
    tx.set(ref(C.households, familia), { createdAt: vinculo.joinedAt });
    tx.set(ref(C.memberships, accountId), vinculo);
  }

  async function responsaveisDe(tx: Transaction | null, householdId: string) {
    const consulta = col(C.memberships).where('householdId', '==', householdId);
    const resultado = tx ? await tx.get(consulta) : await consulta.get();
    return resultado.docs
      .map((doc) => ({ accountId: doc.id, ...(doc.data() as Vinculo) }))
      .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt) || a.id.localeCompare(b.id));
  }

  async function pessoasDe(tx: Transaction | null, householdId: string) {
    const consulta = col(C.members).where('householdId', '==', householdId);
    return tx ? tx.get(consulta) : consulta.get();
  }

  /** Família da conta fora de transação; `undefined` se a conta ainda não tem. */
  async function familiaDe(accountId: string): Promise<string | undefined> {
    const doc = await ref(C.memberships, accountId).get();
    return doc.exists ? (doc.data() as Vinculo).householdId : undefined;
  }

  /** Garante a família da conta (cria a própria na primeira vez) e devolve o identificador. */
  async function garantirFamilia(accountId: string): Promise<string> {
    return db.runTransaction(async (tx) => {
      const { vinculo, escritas } = await vinculoDe(tx, accountId);
      escritas.forEach((escrever) => escrever());
      return vinculo.householdId;
    });
  }

  /** Apaga em lotes (a escrita em lote do Firestore aceita até 500 operações). */
  async function apagarVarios(refs: readonly DocumentReference[]): Promise<void> {
    for (let i = 0; i < refs.length; i += 400) {
      const lote = db.batch();
      refs.slice(i, i + 400).forEach((r) => lote.delete(r));
      await lote.commit();
    }
  }

  async function dosesDoMembro(memberId: string) {
    return col(C.doses).where('memberId', '==', memberId).get();
  }

  // ---- Pessoas ----

  const members: MemberRepository = {
    async list(ownerId) {
      const familia = await familiaDe(ownerId);
      if (!familia) return [];
      const resultado = await pessoasDe(null, familia);
      return resultado.docs
        .map((doc) => doc.data())
        .sort((a, b) => (a['seq'] as number) - (b['seq'] as number))
        .map((dados) => semInternos<StoredMember>(dados, ['seq', 'householdId']));
    },
    async get(ownerId, id) {
      const familia = await familiaDe(ownerId);
      if (!familia) return undefined;
      const doc = await ref(C.members, id).get();
      if (!doc.exists || doc.data()?.['householdId'] !== familia) return undefined;
      return semInternos<StoredMember>(doc.data() as DocumentData, ['seq', 'householdId']);
    },
    async save(ownerId, member) {
      await db.runTransaction(async (tx) => {
        const { vinculo, escritas } = await vinculoDe(tx, ownerId);
        const doc = await tx.get(ref(C.members, member.id));
        escritas.forEach((escrever) => escrever());
        if (doc.exists) {
          // Pessoa de outra família: nada muda (o dono não alcança dado alheio).
          if (doc.data()?.['householdId'] !== vinculo.householdId) return;
          tx.set(ref(C.members, member.id), {
            ...member,
            householdId: vinculo.householdId,
            seq: doc.data()?.['seq'],
          });
          return;
        }
        tx.set(ref(C.members, member.id), {
          ...member,
          householdId: vinculo.householdId,
          seq: proximaSequencia(),
        });
      });
    },
    async remove(ownerId, id) {
      const familia = await familiaDe(ownerId);
      if (!familia) return;
      const doc = await ref(C.members, id).get();
      if (!doc.exists || doc.data()?.['householdId'] !== familia) return;
      const doses = await dosesDoMembro(id);
      await apagarVarios([ref(C.members, id), ...doses.docs.map((d) => d.ref)]);
    },
  };

  // ---- Doses ----

  const doses: DoseRepository = {
    async listByMember(ownerId, memberId) {
      const familia = await familiaDe(ownerId);
      if (!familia) return [];
      const pessoa = await ref(C.members, memberId).get();
      if (!pessoa.exists || pessoa.data()?.['householdId'] !== familia) return [];
      const resultado = await dosesDoMembro(memberId);
      return resultado.docs
        .map((doc) => doc.data())
        .sort((a, b) => (a['seq'] as number) - (b['seq'] as number))
        .map((dados) => semInternos<StoredDose>(dados, ['seq']));
    },
    async get(ownerId, id) {
      const familia = await familiaDe(ownerId);
      if (!familia) return undefined;
      const doc = await ref(C.doses, id).get();
      if (!doc.exists) return undefined;
      const dados = doc.data() as DocumentData;
      const pessoa = await ref(C.members, dados['memberId'] as string).get();
      if (!pessoa.exists || pessoa.data()?.['householdId'] !== familia) return undefined;
      return semInternos<StoredDose>(dados, ['seq']);
    },
    async saveMany(ownerId, lista) {
      if (lista.length === 0) return;
      await db.runTransaction(async (tx) => {
        const { vinculo, escritas } = await vinculoDe(tx, ownerId);
        // Leituras primeiro: as doses que já existem e, depois, as pessoas de todas elas.
        const existentes = new Map<string, DocumentData | undefined>();
        for (const dose of lista) {
          const doc = await tx.get(ref(C.doses, dose.id));
          existentes.set(dose.id, doc.exists ? doc.data() : undefined);
        }
        const ids = new Set(lista.map((d) => d.memberId));
        for (const atual of existentes.values()) {
          if (atual) ids.add(atual['memberId'] as string);
        }
        const daFamilia = new Map<string, boolean>();
        for (const id of ids) {
          const doc = await tx.get(ref(C.members, id));
          daFamilia.set(id, doc.exists && doc.data()?.['householdId'] === vinculo.householdId);
        }
        escritas.forEach((escrever) => escrever());
        for (const dose of lista) {
          const atual = existentes.get(dose.id);
          // Só grava dose de pessoa da própria família; dose alheia não é tocada.
          if (!daFamilia.get(dose.memberId)) continue;
          if (atual && !daFamilia.get(atual['memberId'] as string)) continue;
          tx.set(ref(C.doses, dose.id), { ...dose, seq: atual?.['seq'] ?? proximaSequencia() });
        }
      });
    },
  };

  // ---- Consentimento ----

  const consents: ConsentRepository = {
    async get(ownerId) {
      const doc = await ref(C.consents, ownerId).get();
      return doc.exists ? (doc.data() as StoredConsent) : undefined;
    },
    async save(ownerId, consent) {
      await ref(C.consents, ownerId).set({ ...consent });
    },
  };

  // ---- Lembretes ----

  const reminders: ReminderRepository = {
    async getEmailEnabled(ownerId) {
      const doc = await ref(C.accounts, ownerId).get();
      return doc.exists ? doc.data()?.['remindersEnabled'] !== false : true;
    },
    async setEmailEnabled(ownerId, enabled) {
      await ref(C.accounts, ownerId).set({ remindersEnabled: enabled }, { merge: true });
    },
    async listEmailCandidates(today) {
      const limite = addDays(today, MAX_REMIND_DAYS_BEFORE);
      const candidatos: ReminderCandidate[] = [];
      const consentimentos = await col(C.consents).get();
      const contas = consentimentos.docs.map((doc) => doc.id).sort();
      for (const accountId of contas) {
        const conta = await ref(C.accounts, accountId).get();
        if (!conta.exists || conta.data()?.['remindersEnabled'] === false) continue;
        if ((await ref(C.reminderLog, `${accountId}_${today}`).get()).exists) continue;
        const familia = await familiaDe(accountId);
        if (!familia) continue;
        const pessoas = await pessoasDe(null, familia);
        for (const pessoa of pessoas.docs) {
          const resultado = await dosesDoMembro(pessoa.id);
          for (const doc of resultado.docs) {
            const d = doc.data();
            const status = d['status'] as DoseStatus;
            if (status !== 'PENDING' && status !== 'SCHEDULED') continue;
            const data = (
              status === 'SCHEDULED' && d['scheduledDate'] ? d['scheduledDate'] : d['dueDate']
            ) as CivilDate;
            if (data < today || data > limite) continue;
            candidatos.push({
              accountId,
              email: conta.data()?.['email'] as string,
              dose: {
                status,
                dueDate: d['dueDate'] as CivilDate,
                scheduledDate: (d['scheduledDate'] ?? null) as CivilDate | null,
                appliedDate: (d['appliedDate'] ?? null) as CivilDate | null,
                ...(d['remindDaysBefore'] == null
                  ? {}
                  : { remindDaysBefore: d['remindDaysBefore'] as number }),
                ...(d['remindDays'] == null ? {} : { remindDays: d['remindDays'] as number[] }),
              },
            });
          }
        }
      }
      return candidatos;
    },
    async claimEmailDay(accountId, today) {
      try {
        await ref(C.reminderLog, `${accountId}_${today}`).create({ accountId, sentOn: today });
        return true;
      } catch (error) {
        if ((error as { code?: number }).code === ALREADY_EXISTS) return false;
        throw error;
      }
    },
    async releaseEmailDay(accountId, today) {
      await ref(C.reminderLog, `${accountId}_${today}`).delete();
    },
  };

  // ---- Conta e login ----

  const auth: AuthRepository = {
    async createAccount(account) {
      return db.runTransaction(async (tx) => {
        const email = ref(C.emails, account.email);
        if ((await tx.get(email)).exists) return false;
        const familia = newId();
        tx.set(email, { accountId: account.id });
        tx.set(ref(C.accounts, account.id), { ...account, remindersEnabled: true });
        // Toda conta nasce dona de uma família própria (ADR-029).
        tx.set(ref(C.households, familia), { createdAt: account.createdAt });
        tx.set(ref(C.memberships, account.id), {
          id: newId(),
          householdId: familia,
          role: 'OWNER',
          joinedAt: account.createdAt,
        } satisfies Vinculo);
        return true;
      });
    },
    async findAccountByEmail(email) {
      const doc = await ref(C.emails, email).get();
      if (!doc.exists) return undefined;
      return auth.findAccountById(doc.data()?.['accountId'] as string);
    },
    async findAccountById(id) {
      const doc = await ref(C.accounts, id).get();
      if (!doc.exists) return undefined;
      const d = doc.data() as DocumentData;
      return {
        id: d['id'] as string,
        email: d['email'] as string,
        passwordHash: d['passwordHash'] as string,
        createdAt: d['createdAt'] as string,
      } satisfies StoredAccount;
    },
    async saveRefreshToken(token) {
      await ref(C.refresh, token.tokenHash).set({ ...token });
    },
    async findRefreshToken(tokenHash) {
      const doc = await ref(C.refresh, tokenHash).get();
      return doc.exists ? (doc.data() as StoredRefreshToken) : undefined;
    },
    async revokeRefreshToken(tokenHash, at) {
      await db.runTransaction(async (tx) => {
        const alvo = ref(C.refresh, tokenHash);
        const doc = await tx.get(alvo);
        if (doc.exists && !doc.data()?.['revokedAt']) tx.update(alvo, { revokedAt: at });
      });
    },
    async revokeAllRefreshTokens(accountId, at) {
      const resultado = await col(C.refresh).where('accountId', '==', accountId).get();
      await Promise.all(
        resultado.docs
          .filter((doc) => !doc.data()['revokedAt'])
          .map((doc) => doc.ref.update({ revokedAt: at })),
      );
    },
    async savePasswordResetToken(token) {
      await ref(C.reset, token.tokenHash).set({ ...token });
    },
    async findPasswordResetToken(tokenHash) {
      const doc = await ref(C.reset, tokenHash).get();
      return doc.exists ? (doc.data() as StoredPasswordResetToken) : undefined;
    },
    async consumePasswordResetToken(tokenHash, at) {
      return db.runTransaction(async (tx) => {
        const alvo = ref(C.reset, tokenHash);
        const doc = await tx.get(alvo);
        if (!doc.exists || doc.data()?.['usedAt']) return false;
        tx.update(alvo, { usedAt: at });
        return true;
      });
    },
    async updatePasswordHash(accountId, passwordHash) {
      await ref(C.accounts, accountId).set({ passwordHash }, { merge: true });
    },
    async deleteAccount(id) {
      const conta = await ref(C.accounts, id).get();
      const apagar: DocumentReference[] = [
        ref(C.accounts, id),
        ref(C.memberships, id),
        ref(C.consents, id),
      ];
      if (conta.exists) apagar.push(ref(C.emails, conta.data()?.['email'] as string));
      for (const nome of [C.refresh, C.reset, C.reminderLog]) {
        const resultado = await col(nome).where('accountId', '==', id).get();
        apagar.push(...resultado.docs.map((doc) => doc.ref));
      }
      await apagarVarios(apagar);
    },
  };

  const accounts: AccountRepository = {
    async deleteAll(ownerId) {
      let doses: DocumentReference[] = [];
      await db.runTransaction(async (tx) => {
        doses = [];
        // Leituras primeiro (o Firestore não aceita ler depois de escrever na transação).
        const vinculoDoc = await tx.get(ref(C.memberships, ownerId));
        const meu = vinculoDoc.exists ? (vinculoDoc.data() as Vinculo) : undefined;
        const responsaveis = meu ? await responsaveisDe(tx, meu.householdId) : [];
        const sozinha = responsaveis.length <= 1;
        const pessoas = meu && sozinha ? await pessoasDe(tx, meu.householdId) : undefined;
        const convites =
          meu && sozinha
            ? await tx.get(col(C.invites).where('householdId', '==', meu.householdId))
            : undefined;
        for (const pessoa of pessoas?.docs ?? []) {
          const resultado = await tx.get(col(C.doses).where('memberId', '==', pessoa.id));
          doses.push(...resultado.docs.map((d) => d.ref));
        }

        if (meu && sozinha) {
          // A única conta: apaga a família inteira (pessoas, doses e convites).
          tx.delete(ref(C.households, meu.householdId));
          tx.delete(ref(C.memberships, ownerId));
          convites?.docs.forEach((doc) => tx.delete(doc.ref));
          pessoas?.docs.forEach((doc) => tx.delete(doc.ref));
        } else if (meu) {
          // Divide a família: só sai dela. Se era a dona, a propriedade passa ao mais antigo.
          const proximo = responsaveis.find((r) => r.accountId !== ownerId);
          if (meu.role === 'OWNER' && proximo) {
            tx.update(ref(C.memberships, proximo.accountId), { role: 'OWNER' });
          }
          tx.delete(ref(C.memberships, ownerId));
        }
        tx.delete(ref(C.consents, ownerId));
      });
      // As doses saem em lotes, depois da transação (podem passar do limite de uma transação).
      await apagarVarios(doses);
    },
  };

  // ---- Família e convites ----

  const households: HouseholdRepository = {
    async get(accountId): Promise<StoredHousehold> {
      const familia = await garantirFamilia(accountId);
      const responsaveis = await responsaveisDe(null, familia);
      const pessoas = await pessoasDe(null, familia);
      return {
        id: familia,
        memberCount: pessoas.size,
        guardians: responsaveis.map((r) => ({
          id: r.id,
          accountId: r.accountId,
          role: r.role,
          joinedAt: r.joinedAt,
        })),
      };
    },
    async countActiveInvites(householdId, nowIso) {
      const resultado = await col(C.invites).where('householdId', '==', householdId).get();
      const agora = Date.parse(nowIso);
      return resultado.docs.filter((doc) => {
        const d = doc.data();
        return !d['usedAt'] && Date.parse(d['expiresAt'] as string) > agora;
      }).length;
    },
    async createInvite(invite: StoredInvite) {
      await ref(C.invites, invite.tokenHash).set({ ...invite });
    },
    async revokeInvites(householdId) {
      const resultado = await col(C.invites).where('householdId', '==', householdId).get();
      await apagarVarios(
        resultado.docs.filter((doc) => !doc.data()['usedAt']).map((doc) => doc.ref),
      );
    },
    async join(accountId, tokenHash, nowIso, moveMembers): Promise<JoinOutcome> {
      return db.runTransaction(async (tx) => {
        const { vinculo: meu, escritas } = await vinculoDe(tx, accountId);
        const conviteRef = ref(C.invites, tokenHash);
        const convite = await tx.get(conviteRef);
        const dados = convite.data();
        const vale =
          convite.exists &&
          !dados?.['usedAt'] &&
          Date.parse(String(dados?.['expiresAt'])) > Date.parse(nowIso);
        const alvo = vale ? (dados?.['householdId'] as string) : undefined;
        const responsaveis = await responsaveisDe(tx, meu.householdId);
        const pessoas = await pessoasDe(tx, meu.householdId);
        const meusConvites = await tx.get(
          col(C.invites).where('householdId', '==', meu.householdId),
        );

        escritas.forEach((escrever) => escrever());
        if (!alvo) return { status: 'INVALID' };
        if (meu.householdId === alvo) return { status: 'ALREADY_MEMBER' };
        if (responsaveis.length > 1) return { status: 'NOT_ALONE' };
        if (pessoas.size > 0 && !moveMembers) {
          return { status: 'HAS_MEMBERS', memberCount: pessoas.size };
        }
        // O código vale uma vez: marcado como usado dentro da transação, só o primeiro passa.
        tx.update(conviteRef, { usedAt: nowIso, usedByAccountId: accountId });
        pessoas.docs.forEach((doc) => tx.update(doc.ref, { householdId: alvo }));
        meusConvites.docs.forEach((doc) => tx.delete(doc.ref));
        tx.delete(ref(C.households, meu.householdId));
        tx.set(ref(C.memberships, accountId), {
          id: newId(),
          householdId: alvo,
          role: 'GUARDIAN',
          joinedAt: nowIso,
        } satisfies Vinculo);
        return { status: 'JOINED', moved: pessoas.size };
      });
    },
    async leave(accountId): Promise<LeaveOutcome> {
      return db.runTransaction(async (tx) => {
        const { vinculo, escritas } = await vinculoDe(tx, accountId);
        const responsaveis = await responsaveisDe(tx, vinculo.householdId);
        escritas.forEach((escrever) => escrever());
        if (responsaveis.length <= 1) return 'ALONE';
        if (vinculo.role === 'OWNER') return 'OWNER_MUST_TRANSFER';
        recomecar(tx, accountId);
        return 'LEFT';
      });
    },
    async remove(ownerAccountId, guardianId): Promise<RemoveOutcome> {
      return db.runTransaction(async (tx) => {
        const { vinculo, escritas } = await vinculoDe(tx, ownerAccountId);
        const responsaveis = await responsaveisDe(tx, vinculo.householdId);
        escritas.forEach((escrever) => escrever());
        if (vinculo.role !== 'OWNER') return 'FORBIDDEN';
        const alvo = responsaveis.find(
          (r) => r.id === guardianId && r.accountId !== ownerAccountId,
        );
        if (!alvo) return 'NOT_FOUND';
        recomecar(tx, alvo.accountId);
        return 'REMOVED';
      });
    },
    async transfer(ownerAccountId, guardianId): Promise<TransferOutcome> {
      return db.runTransaction(async (tx) => {
        const { vinculo, escritas } = await vinculoDe(tx, ownerAccountId);
        const responsaveis = await responsaveisDe(tx, vinculo.householdId);
        escritas.forEach((escrever) => escrever());
        if (vinculo.role !== 'OWNER') return 'FORBIDDEN';
        const alvo = responsaveis.find(
          (r) => r.id === guardianId && r.accountId !== ownerAccountId,
        );
        if (!alvo) return 'NOT_FOUND';
        tx.update(ref(C.memberships, alvo.accountId), { role: 'OWNER' });
        tx.update(ref(C.memberships, ownerAccountId), { role: 'GUARDIAN' });
        return 'TRANSFERRED';
      });
    },
  };

  const ping = async () => {
    await ref(C.ping, 'ok').get();
  };

  return { members, doses, consents, accounts, reminders, households, auth, ping };
}
