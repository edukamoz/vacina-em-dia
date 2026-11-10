import { randomUUID } from 'node:crypto';
import type { StoredDose, StoredMember } from './repositories';
import { createInMemoryAuthRepository } from './in-memory-auth';
import { createInMemoryStore } from './in-memory-store';
import { createMssqlExecutor } from './sql/mssql-executor';
import { createSqlRepositories } from './sql/sql-repositories';
import type { AuthRepository } from './repositories';

/**
 * Testes de contrato: a mesma bateria roda nos repositórios em memória (sempre) e no Azure SQL
 * (só quando `SQL_TEST_SERVER` e `SQL_TEST_DATABASE` estão definidos, com `az login` ativo). Assim,
 * as duas implementações garantem o mesmo comportamento, inclusive o isolamento entre donos.
 */
function inMemory() {
  const store = createInMemoryStore();
  return {
    ...store,
    auth: createInMemoryAuthRepository() as AuthRepository,
    close: async () => {},
  };
}

function azureSql() {
  const executor = createMssqlExecutor({
    server: process.env['SQL_TEST_SERVER'] as string,
    database: process.env['SQL_TEST_DATABASE'] as string,
  });
  return { ...createSqlRepositories(executor), close: () => executor.close() };
}

const sqlConfigured = Boolean(process.env['SQL_TEST_SERVER'] && process.env['SQL_TEST_DATABASE']);

const implementations: [string, () => ReturnType<typeof inMemory>, boolean][] = [
  ['memória', inMemory, true],
  ['Azure SQL', azureSql, sqlConfigured],
];

describe.each(implementations)('repositórios (%s)', (_name, factory, enabled) => {
  const run = enabled ? describe : describe.skip;
  run('contrato', () => {
    const repos = factory();
    const created: string[] = [];

    /** Cria uma conta de teste e devolve o id; o SQL exige a conta (chave estrangeira). */
    async function newOwner(): Promise<string> {
      const id = randomUUID();
      const ok = await repos.auth.createAccount({
        id,
        email: `${id}@teste.invalido`,
        passwordHash: 'scrypt$16$8$1$c2Fs$hash',
        createdAt: '2026-10-07T12:00:00.000Z',
      });
      expect(ok).toBe(true);
      created.push(id);
      return id;
    }

    const member = (id: string, name = 'Ana'): StoredMember => ({
      id,
      name,
      birthDate: '2024-03-15',
      isPregnant: false,
      relationship: 'DAUGHTER',
      kind: 'PERSON',
      species: null,
    });
    const dose = (id: string, memberId: string, over: Partial<StoredDose> = {}): StoredDose => ({
      id,
      memberId,
      ruleId: 'regra-1',
      status: 'PENDING',
      dueDate: '2026-12-01',
      scheduledDate: null,
      appliedDate: null,
      ...over,
    });

    afterAll(async () => {
      for (const id of created) {
        await repos.accounts.deleteAll(id);
        await repos.auth.deleteAccount(id);
      }
      await repos.close();
    }, 180_000);

    test('CT-DB-01: membro grava, lista na ordem de cadastro, busca e atualiza', async () => {
      const owner = await newOwner();
      const [a, b] = [randomUUID(), randomUUID()];
      await repos.members.save(owner, member(a, 'Ana'));
      await repos.members.save(owner, member(b, 'Bia'));
      expect((await repos.members.list(owner)).map((m) => m.name)).toEqual(['Ana', 'Bia']);
      await repos.members.save(owner, { ...member(a, 'Ana Maria'), isPregnant: true });
      expect(await repos.members.get(owner, a)).toEqual({
        ...member(a, 'Ana Maria'),
        isPregnant: true,
      });
      expect(await repos.members.list(owner)).toHaveLength(2);
      expect(await repos.members.get(owner, randomUUID())).toBeUndefined();
    });

    test('CT-DB-02: nome com acento e emoji volta igual (Unicode)', async () => {
      const owner = await newOwner();
      const id = randomUUID();
      await repos.members.save(owner, member(id, 'João Çedilha ñ'));
      expect((await repos.members.get(owner, id))?.name).toBe('João Çedilha ñ');
    });

    test('CT-DB-03: um dono não vê, não lista e não remove o membro de outro', async () => {
      const [alice, bob] = [await newOwner(), await newOwner()];
      const id = randomUUID();
      await repos.members.save(alice, member(id));
      expect(await repos.members.get(bob, id)).toBeUndefined();
      expect(await repos.members.list(bob)).toEqual([]);
      await repos.members.remove(bob, id);
      expect(await repos.members.get(alice, id)).toEqual(member(id));
    });

    test('CT-DB-AV: dose avulsa grava sem linha do calendário e volta com nome e dose', async () => {
      const owner = await newOwner();
      const m = randomUUID();
      await repos.members.save(owner, member(m));
      const [oficial, avulsa] = [randomUUID(), randomUUID()];
      await repos.doses.saveMany(owner, [
        dose(oficial, m),
        dose(avulsa, m, {
          ruleId: null,
          custom: { vaccine: 'Febre tifoide', doseLabel: '1ª dose' },
        }),
      ]);
      const lidas = await repos.doses.listByMember(owner, m);
      expect(lidas.map((d) => d.ruleId)).toEqual(['regra-1', null]);
      expect(lidas[1]?.custom).toEqual({ vaccine: 'Febre tifoide', doseLabel: '1ª dose' });
      await repos.doses.saveMany(owner, [
        dose(avulsa, m, {
          ruleId: null,
          custom: { vaccine: 'Febre tifoide', doseLabel: '1ª dose' },
          status: 'APPLIED',
          appliedDate: '2026-10-01',
        }),
      ]);
      const depois = await repos.doses.get(owner, avulsa);
      expect(depois).toMatchObject({ status: 'APPLIED', appliedDate: '2026-10-01', ruleId: null });
      expect(depois?.custom?.vaccine).toBe('Febre tifoide');
    });

    test('CT-DB-04: doses gravam, atualizam e listam na ordem de geração, com datas e nulos', async () => {
      const owner = await newOwner();
      const m = randomUUID();
      await repos.members.save(owner, member(m));
      const [d1, d2] = [randomUUID(), randomUUID()];
      await repos.doses.saveMany(owner, [dose(d1, m), dose(d2, m, { ruleId: 'regra-2' })]);
      await repos.doses.saveMany(owner, [
        dose(d1, m, { status: 'SCHEDULED', scheduledDate: '2026-11-20' }),
      ]);
      expect((await repos.doses.listByMember(owner, m)).map((d) => d.id)).toEqual([d1, d2]);
      expect(await repos.doses.get(owner, d1)).toEqual(
        dose(d1, m, { status: 'SCHEDULED', scheduledDate: '2026-11-20' }),
      );
      await repos.doses.saveMany(owner, [
        dose(d2, m, { ruleId: 'regra-2', status: 'APPLIED', appliedDate: '2026-10-01' }),
      ]);
      expect((await repos.doses.get(owner, d2))?.appliedDate).toBe('2026-10-01');
    });

    test('CT-REC-130: a repetição, a série e o aviso antecipado gravam, leem e podem ser encerrados', async () => {
      const owner = await newOwner();
      const m = randomUUID();
      await repos.members.save(owner, member(m));
      const [d1, d2, series] = [randomUUID(), randomUUID(), randomUUID()];
      const avulsa = (id: string, over: Partial<StoredDose> = {}): StoredDose => ({
        ...dose(id, m, { ruleId: null }),
        custom: { vaccine: 'Gripe', doseLabel: 'Anual' },
        remindDaysBefore: 14,
        seriesId: series,
        occurrence: 1,
        recurrence: {
          unit: 'YEAR',
          every: 1,
          anchor: 'SCHEDULE',
          anchorDate: '2026-12-01',
          endDate: null,
          maxDoses: 5,
        },
        ...over,
      });
      await repos.doses.saveMany(owner, [avulsa(d1)]);
      expect(await repos.doses.get(owner, d1)).toEqual(avulsa(d1));
      // Aplicar grava a dose e a próxima juntas; encerrar a série zera a repetição da dose aberta.
      await repos.doses.saveMany(owner, [
        avulsa(d1, { status: 'APPLIED', appliedDate: '2026-12-01' }),
        avulsa(d2, { occurrence: 2, dueDate: '2027-12-01' }),
      ]);
      await repos.doses.saveMany(owner, [
        avulsa(d2, { occurrence: 2, dueDate: '2027-12-01', recurrence: null }),
      ]);
      const encerrada = await repos.doses.get(owner, d2);
      expect(encerrada?.recurrence ?? null).toBeNull();
      expect(encerrada).toMatchObject({ seriesId: series, occurrence: 2, remindDaysBefore: 14 });
      expect((await repos.doses.listByMember(owner, m)).map((d) => d.occurrence)).toEqual([1, 2]);
    });

    test('CT-OFIC-40: dose oficial de uma série grava série e número, sem guardar a regra', async () => {
      const owner = await newOwner();
      const m = randomUUID();
      await repos.members.save(owner, member(m));
      const [d1, d2, serie] = [randomUUID(), randomUUID(), randomUUID()];
      await repos.doses.saveMany(owner, [dose(d1, m, { ruleId: 'idoso-influenza' })]);
      // Aplicar: a oficial ganha a série e o número 1 e a próxima nasce com o 2, na mesma linha.
      await repos.doses.saveMany(owner, [
        dose(d1, m, {
          ruleId: 'idoso-influenza',
          status: 'APPLIED',
          appliedDate: '2026-12-01',
          seriesId: serie,
          occurrence: 1,
          remindDaysBefore: null,
        }),
        dose(d2, m, {
          ruleId: 'idoso-influenza',
          dueDate: '2027-12-01',
          seriesId: serie,
          occurrence: 2,
          remindDaysBefore: null,
        }),
      ]);
      const lidas = await repos.doses.listByMember(owner, m);
      expect(lidas.map((d) => [d.ruleId, d.occurrence, d.status])).toEqual([
        ['idoso-influenza', 1, 'APPLIED'],
        ['idoso-influenza', 2, 'PENDING'],
      ]);
      expect(lidas[1]?.recurrence ?? null).toBeNull();
      expect(lidas[1]).not.toHaveProperty('custom');
    });

    test('CT-DB-05: outro dono não vê nem altera a dose', async () => {
      const [alice, bob] = [await newOwner(), await newOwner()];
      const m = randomUUID();
      const d = randomUUID();
      await repos.members.save(alice, member(m));
      await repos.doses.saveMany(alice, [dose(d, m)]);
      expect(await repos.doses.get(bob, d)).toBeUndefined();
      expect(await repos.doses.listByMember(bob, m)).toEqual([]);
      await repos.doses.saveMany(bob, [dose(d, m, { status: 'CANCELLED' })]);
      expect((await repos.doses.get(alice, d))?.status).toBe('PENDING');
    });

    test('CT-DB-06: remover o membro remove as doses dele', async () => {
      const owner = await newOwner();
      const m = randomUUID();
      const d = randomUUID();
      await repos.members.save(owner, member(m));
      await repos.doses.saveMany(owner, [dose(d, m)]);
      await repos.members.remove(owner, m);
      expect(await repos.doses.get(owner, d)).toBeUndefined();
      expect(await repos.members.get(owner, m)).toBeUndefined();
    });

    test('CT-DB-07: consentimento grava, atualiza e é separado por dono', async () => {
      const [alice, bob] = [await newOwner(), await newOwner()];
      expect(await repos.consents.get(alice)).toBeUndefined();
      const first = {
        termVersion: '1',
        acceptedAt: '2026-10-07T12:00:00.123Z',
        guardianDeclaration: false,
      };
      await repos.consents.save(alice, first);
      expect(await repos.consents.get(alice)).toEqual(first);
      const second = { ...first, termVersion: '2', guardianDeclaration: true };
      await repos.consents.save(alice, second);
      expect(await repos.consents.get(alice)).toEqual(second);
      expect(await repos.consents.get(bob)).toBeUndefined();
    });

    test('CT-DB-08: excluir os dados do dono apaga membros, doses e consentimento, e só os dele', async () => {
      const [alice, bob] = [await newOwner(), await newOwner()];
      const [ma, mb, da] = [randomUUID(), randomUUID(), randomUUID()];
      await repos.members.save(alice, member(ma));
      await repos.members.save(bob, member(mb));
      await repos.doses.saveMany(alice, [dose(da, ma)]);
      await repos.consents.save(alice, {
        termVersion: '1',
        acceptedAt: '2026-10-07T12:00:00.000Z',
        guardianDeclaration: false,
      });
      await repos.accounts.deleteAll(alice);
      expect(await repos.members.list(alice)).toEqual([]);
      expect(await repos.doses.get(alice, da)).toBeUndefined();
      expect(await repos.consents.get(alice)).toBeUndefined();
      expect(await repos.members.get(bob, mb)).toEqual(member(mb));
    });

    test('CT-DB-09: conta: e-mail único, busca por e-mail e por id', async () => {
      const id = await newOwner();
      const email = `${id}@teste.invalido`;
      const found = await repos.auth.findAccountByEmail(email);
      expect(found).toMatchObject({ id, email, createdAt: '2026-10-07T12:00:00.000Z' });
      expect(await repos.auth.findAccountById(id)).toEqual(found);
      const duplicate = await repos.auth.createAccount({
        id: randomUUID(),
        email,
        passwordHash: 'x',
        createdAt: '2026-10-07T12:00:00.000Z',
      });
      expect(duplicate).toBe(false);
      expect(await repos.auth.findAccountByEmail('ninguem@teste.invalido')).toBeUndefined();
    });

    test('CT-DB-10: tokens de renovação: guarda só o hash, revoga um e todos, e some com a conta', async () => {
      const id = await newOwner();
      const hash = (n: number) => `${n}`.padStart(64, 'a');
      const expiresAt = '2026-11-06T12:00:00.000Z';
      await repos.auth.saveRefreshToken({ tokenHash: hash(1), accountId: id, expiresAt });
      await repos.auth.saveRefreshToken({ tokenHash: hash(2), accountId: id, expiresAt });
      expect(await repos.auth.findRefreshToken(hash(1))).toEqual({
        tokenHash: hash(1),
        accountId: id,
        expiresAt,
      });
      await repos.auth.revokeRefreshToken(hash(1), '2026-10-07T13:00:00.000Z');
      expect((await repos.auth.findRefreshToken(hash(1)))?.revokedAt).toBe(
        '2026-10-07T13:00:00.000Z',
      );
      expect((await repos.auth.findRefreshToken(hash(2)))?.revokedAt).toBeUndefined();
      await repos.auth.revokeAllRefreshTokens(id, '2026-10-07T14:00:00.000Z');
      expect((await repos.auth.findRefreshToken(hash(2)))?.revokedAt).toBe(
        '2026-10-07T14:00:00.000Z',
      );
      expect((await repos.auth.findRefreshToken(hash(1)))?.revokedAt).toBe(
        '2026-10-07T13:00:00.000Z',
      );
      await repos.auth.deleteAccount(id);
      expect(await repos.auth.findAccountById(id)).toBeUndefined();
      expect(await repos.auth.findRefreshToken(hash(2))).toBeUndefined();
    });

    test('CT-DB-11: token de redefinição: guarda só o hash, uso único atômico, troca a senha e some com a conta', async () => {
      const id = await newOwner();
      const hash = 'b'.repeat(64);
      const expiresAt = '2026-10-07T13:00:00.000Z';
      await repos.auth.savePasswordResetToken({ tokenHash: hash, accountId: id, expiresAt });
      expect(await repos.auth.findPasswordResetToken(hash)).toEqual({
        tokenHash: hash,
        accountId: id,
        expiresAt,
      });
      expect(await repos.auth.findPasswordResetToken('c'.repeat(64))).toBeUndefined();
      const [first, second] = await Promise.all([
        repos.auth.consumePasswordResetToken(hash, '2026-10-07T12:30:00.000Z'),
        repos.auth.consumePasswordResetToken(hash, '2026-10-07T12:30:01.000Z'),
      ]);
      expect([first, second].filter(Boolean)).toHaveLength(1);
      expect((await repos.auth.findPasswordResetToken(hash))?.usedAt).toMatch(
        /^2026-10-07T12:30:0[01]\.000Z$/,
      );
      expect(await repos.auth.consumePasswordResetToken('c'.repeat(64), expiresAt)).toBe(false);
      await repos.auth.updatePasswordHash(id, 'scrypt$16$8$1$bm92bw$novo');
      expect((await repos.auth.findAccountById(id))?.passwordHash).toBe(
        'scrypt$16$8$1$bm92bw$novo',
      );
      await repos.auth.deleteAccount(id);
      expect(await repos.auth.findPasswordResetToken(hash)).toBeUndefined();
    });

    // ---- Família com vários responsáveis (B15, ADR-029) ----
    const AGORA = '2026-11-10T12:00:00.000Z';
    const DEPOIS = '2026-11-17T12:00:00.000Z';
    const ANTES = '2026-11-09T12:00:00.000Z';

    /** Gera um convite da família da conta e devolve o hash para entrar. */
    async function convidar(donoId: string, expiresAt = DEPOIS): Promise<string> {
      const familia = await repos.households.get(donoId);
      const tokenHash = randomUUID().replace(/-/g, '').padEnd(64, '0');
      await repos.households.createInvite({
        tokenHash,
        householdId: familia.id,
        createdByAccountId: donoId,
        expiresAt,
      });
      return tokenHash;
    }

    /** Duas contas na mesma família: devolve (dono, responsável) já unidas. */
    async function duplaNaMesmaFamilia() {
      const [dono, resp] = [await newOwner(), await newOwner()];
      const hash = await convidar(dono);
      expect(await repos.households.join(resp, hash, AGORA, false)).toEqual({
        status: 'JOINED',
        moved: 0,
      });
      return { dono, resp };
    }

    test('CT-FAMR-40: a primeira consulta cria a família própria, com a conta como dona', async () => {
      const conta = await newOwner();
      const familia = await repos.households.get(conta);
      expect(familia.memberCount).toBe(0);
      expect(familia.guardians).toHaveLength(1);
      expect(familia.guardians[0]).toMatchObject({ accountId: conta, role: 'OWNER' });
      // Consultar de novo devolve a mesma família, sem criar outra.
      expect((await repos.households.get(conta)).id).toBe(familia.id);
    });

    test('CT-FAMR-41: dois responsáveis enxergam e editam as mesmas pessoas e doses', async () => {
      const { dono, resp } = await duplaNaMesmaFamilia();
      const [m, d] = [randomUUID(), randomUUID()];
      await repos.members.save(dono, member(m, 'Bebê'));
      await repos.doses.saveMany(dono, [dose(d, m)]);
      expect((await repos.members.list(resp)).map((x) => x.name)).toEqual(['Bebê']);
      expect(await repos.members.get(resp, m)).toMatchObject({ id: m });
      expect((await repos.doses.listByMember(resp, m)).map((x) => x.id)).toEqual([d]);
      // O responsável aplica a dose e o dono vê.
      await repos.doses.saveMany(resp, [
        dose(d, m, { status: 'APPLIED', appliedDate: '2026-11-01' }),
      ]);
      expect((await repos.doses.get(dono, d))?.status).toBe('APPLIED');
      // E cadastra uma pessoa que o dono também vê.
      const m2 = randomUUID();
      await repos.members.save(resp, member(m2, 'Vovó'));
      expect((await repos.members.list(dono)).map((x) => x.name)).toEqual(['Bebê', 'Vovó']);
    });

    test('CT-FAMR-42: outra família não vê, não altera e não remove nada da primeira', async () => {
      const { dono } = await duplaNaMesmaFamilia();
      const fora = await newOwner();
      const [m, d] = [randomUUID(), randomUUID()];
      await repos.members.save(dono, member(m));
      await repos.doses.saveMany(dono, [dose(d, m)]);
      expect(await repos.members.list(fora)).toEqual([]);
      expect(await repos.members.get(fora, m)).toBeUndefined();
      expect(await repos.doses.get(fora, d)).toBeUndefined();
      expect(await repos.doses.listByMember(fora, m)).toEqual([]);
      await repos.doses.saveMany(fora, [dose(d, m, { status: 'CANCELLED' })]);
      await repos.members.remove(fora, m);
      expect((await repos.doses.get(dono, d))?.status).toBe('PENDING');
      expect(await repos.members.get(dono, m)).toBeDefined();
    });

    test('CT-FAMR-43: o código vale uma vez; inválido, vencido e usado têm o mesmo resultado', async () => {
      const [dono, a, b] = [await newOwner(), await newOwner(), await newOwner()];
      const hash = await convidar(dono);
      expect(await repos.households.join(a, hash, AGORA, false)).toMatchObject({
        status: 'JOINED',
      });
      expect(await repos.households.join(b, hash, AGORA, false)).toEqual({ status: 'INVALID' });
      expect(await repos.households.join(b, 'f'.repeat(64), AGORA, false)).toEqual({
        status: 'INVALID',
      });
      const vencido = await convidar(dono, ANTES);
      expect(await repos.households.join(b, vencido, AGORA, false)).toEqual({ status: 'INVALID' });
    });

    test('CT-FAMR-44: entrar na própria família, com o próprio código, não faz nada', async () => {
      const dono = await newOwner();
      const hash = await convidar(dono);
      expect(await repos.households.join(dono, hash, AGORA, false)).toEqual({
        status: 'ALREADY_MEMBER',
      });
      expect((await repos.households.get(dono)).guardians).toHaveLength(1);
    });

    test('CT-FAMR-45: quem tem pessoas só entra confirmando levá-las; a família de origem some', async () => {
      const [dono, novo] = [await newOwner(), await newOwner()];
      const [m1, m2, d] = [randomUUID(), randomUUID(), randomUUID()];
      await repos.members.save(novo, member(m1, 'Filha'));
      await repos.members.save(novo, member(m2, 'Filho'));
      await repos.doses.saveMany(novo, [dose(d, m1)]);
      const origem = (await repos.households.get(novo)).id;
      const hash = await convidar(dono);

      expect(await repos.households.join(novo, hash, AGORA, false)).toEqual({
        status: 'HAS_MEMBERS',
        memberCount: 2,
      });
      // Nada mudou: o convite continua valendo e as pessoas continuam onde estavam.
      expect((await repos.households.get(novo)).id).toBe(origem);
      expect(await repos.members.list(dono)).toEqual([]);

      expect(await repos.households.join(novo, hash, AGORA, true)).toEqual({
        status: 'JOINED',
        moved: 2,
      });
      expect((await repos.members.list(dono)).map((x) => x.name)).toEqual(['Filha', 'Filho']);
      expect((await repos.doses.get(dono, d))?.memberId).toBe(m1);
      const depois = await repos.households.get(novo);
      expect(depois.id).not.toBe(origem);
      expect(depois.memberCount).toBe(2);
      expect(depois.guardians.map((g) => g.role).sort()).toEqual(['GUARDIAN', 'OWNER']);
    });

    test('CT-FAMR-46: quem divide a própria família com outros não entra em outra', async () => {
      const { dono } = await duplaNaMesmaFamilia();
      const outro = await newOwner();
      const hash = await convidar(outro);
      expect(await repos.households.join(dono, hash, AGORA, false)).toEqual({
        status: 'NOT_ALONE',
      });
    });

    test('CT-FAMR-47: o responsável que sai ganha uma família vazia e perde o acesso', async () => {
      const { dono, resp } = await duplaNaMesmaFamilia();
      const m = randomUUID();
      await repos.members.save(dono, member(m));
      expect(await repos.households.leave(resp)).toBe('LEFT');
      expect(await repos.members.list(resp)).toEqual([]);
      expect(await repos.members.get(resp, m)).toBeUndefined();
      expect(await repos.members.get(dono, m)).toBeDefined();
      const minha = await repos.households.get(resp);
      expect(minha.guardians).toHaveLength(1);
      expect(minha.guardians[0]).toMatchObject({ accountId: resp, role: 'OWNER' });
      expect((await repos.households.get(dono)).guardians).toHaveLength(1);
    });

    test('CT-FAMR-48: o dono precisa passar a propriedade antes de sair; quem está só não sai', async () => {
      const { dono } = await duplaNaMesmaFamilia();
      expect(await repos.households.leave(dono)).toBe('OWNER_MUST_TRANSFER');
      expect(await repos.households.leave(await newOwner())).toBe('ALONE');
    });

    test('CT-FAMR-49: o dono remove um responsável; quem não é dono não remove ninguém', async () => {
      const { dono, resp } = await duplaNaMesmaFamilia();
      const alvo = (await repos.households.get(dono)).guardians.find((g) => g.accountId === resp);
      const dele = (await repos.households.get(dono)).guardians.find((g) => g.accountId === dono);
      expect(await repos.households.remove(resp, String(dele?.id))).toBe('FORBIDDEN');
      expect(await repos.households.remove(dono, String(dele?.id))).toBe('NOT_FOUND');
      expect(await repos.households.remove(dono, 'nao-existe')).toBe('NOT_FOUND');
      expect(await repos.households.remove(dono, String(alvo?.id))).toBe('REMOVED');
      expect((await repos.households.get(dono)).guardians).toHaveLength(1);
      const familiaDele = await repos.households.get(resp);
      expect(familiaDele.guardians).toHaveLength(1);
      expect(familiaDele.guardians[0]?.role).toBe('OWNER');
    });

    test('CT-FAMR-50: não se remove o responsável de outra família', async () => {
      const [a, b] = [await duplaNaMesmaFamilia(), await duplaNaMesmaFamilia()];
      const deB = (await repos.households.get(b.dono)).guardians.find(
        (g) => g.accountId === b.resp,
      );
      expect(await repos.households.remove(a.dono, String(deB?.id))).toBe('NOT_FOUND');
      expect((await repos.households.get(b.dono)).guardians).toHaveLength(2);
    });

    test('CT-FAMR-51: o dono passa a propriedade e vira responsável; o responsável não passa', async () => {
      const { dono, resp } = await duplaNaMesmaFamilia();
      const g = (await repos.households.get(dono)).guardians;
      const idDono = String(g.find((x) => x.accountId === dono)?.id);
      const idResp = String(g.find((x) => x.accountId === resp)?.id);
      expect(await repos.households.transfer(resp, idDono)).toBe('FORBIDDEN');
      expect(await repos.households.transfer(dono, 'nao-existe')).toBe('NOT_FOUND');
      expect(await repos.households.transfer(dono, idDono)).toBe('NOT_FOUND');
      expect(await repos.households.transfer(dono, idResp)).toBe('TRANSFERRED');
      const depois = (await repos.households.get(dono)).guardians;
      expect(depois.find((x) => x.accountId === dono)?.role).toBe('GUARDIAN');
      expect(depois.find((x) => x.accountId === resp)?.role).toBe('OWNER');
    });

    test('CT-FAMR-52: convites ativos contam só os não usados e não vencidos; revogar zera', async () => {
      const [dono, outro] = [await newOwner(), await newOwner()];
      const familia = (await repos.households.get(dono)).id;
      const usado = await convidar(dono);
      await convidar(dono);
      await convidar(dono, ANTES);
      expect(await repos.households.countActiveInvites(familia, AGORA)).toBe(3 - 1);
      await repos.households.join(outro, usado, AGORA, false);
      expect(await repos.households.countActiveInvites(familia, AGORA)).toBe(1);
      await repos.households.revokeInvites(familia);
      expect(await repos.households.countActiveInvites(familia, AGORA)).toBe(0);
    });

    test('CT-FAMR-53: excluir a conta que está só apaga tudo, inclusive a família', async () => {
      const conta = await newOwner();
      const [m, d] = [randomUUID(), randomUUID()];
      await repos.members.save(conta, member(m));
      await repos.doses.saveMany(conta, [dose(d, m)]);
      await repos.accounts.deleteAll(conta);
      expect(await repos.members.get(conta, m)).toBeUndefined();
      expect(await repos.doses.get(conta, d)).toBeUndefined();
    });

    test('CT-FAMR-54: excluir a conta de um responsável só a tira da família; as pessoas ficam', async () => {
      const { dono, resp } = await duplaNaMesmaFamilia();
      const m = randomUUID();
      await repos.members.save(resp, member(m, 'Criada pela responsável'));
      await repos.accounts.deleteAll(resp);
      await repos.auth.deleteAccount(resp);
      expect(await repos.members.get(dono, m)).toMatchObject({ name: 'Criada pela responsável' });
      expect((await repos.households.get(dono)).guardians).toHaveLength(1);
    });

    test('CT-FAMR-55: excluir a conta do dono passa a propriedade ao responsável mais antigo', async () => {
      const [dono, antigo, novo] = [await newOwner(), await newOwner(), await newOwner()];
      await repos.households.join(antigo, await convidar(dono), '2026-11-10T12:00:00.000Z', false);
      await repos.households.join(novo, await convidar(dono), '2026-11-10T12:05:00.000Z', false);
      const m = randomUUID();
      await repos.members.save(dono, member(m));
      await repos.accounts.deleteAll(dono);
      await repos.auth.deleteAccount(dono);
      const familia = await repos.households.get(antigo);
      expect(familia.guardians).toHaveLength(2);
      expect(familia.guardians.find((g) => g.accountId === antigo)?.role).toBe('OWNER');
      expect(familia.guardians.find((g) => g.accountId === novo)?.role).toBe('GUARDIAN');
      expect(await repos.members.get(novo, m)).toBeDefined();
    });
  });
});
