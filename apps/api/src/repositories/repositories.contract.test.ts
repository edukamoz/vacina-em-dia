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
    });

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
  });
});
