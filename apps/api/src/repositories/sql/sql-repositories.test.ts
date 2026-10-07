import { createSqlRepositories } from './sql-repositories';
import {
  flag,
  instant,
  isDuplicateKeyError,
  isoUtc,
  nullableText,
  text,
  type SqlExecutor,
  type SqlParams,
  type SqlRow,
} from './sql-executor';

interface Call {
  readonly text: string;
  readonly params: SqlParams;
}

/** Executor falso: devolve as linhas combinadas e guarda cada consulta, para conferir o SQL. */
function fakeDb(rows: readonly SqlRow[] = [], failWith?: unknown) {
  const calls: Call[] = [];
  const executor: SqlExecutor = {
    async run(sqlText, params = {}) {
      calls.push({ text: sqlText, params });
      if (failWith) throw failWith;
      return { rows, rowsAffected: rows.length };
    },
    transaction: (work) => work(executor),
  };
  return { executor, calls };
}

describe('leitura de colunas do banco', () => {
  test('CT-SQL-01: o instante vira ISO com Z e três casas, mesmo sem fração ou com espaços', () => {
    expect(isoUtc('2026-10-07T12:00:00')).toBe('2026-10-07T12:00:00.000Z');
    expect(isoUtc('2026-10-07T12:00:00.12')).toBe('2026-10-07T12:00:00.120Z');
    expect(isoUtc('2026-10-07T12:00:00.123    ')).toBe('2026-10-07T12:00:00.123Z');
    expect(instant({ at: '2026-10-07T12:00:00.5' }, 'at')).toBe('2026-10-07T12:00:00.500Z');
  });

  test('CT-SQL-02: coluna de tipo inesperado lança erro em vez de passar adiante', () => {
    expect(() => text({ a: 1 }, 'a')).toThrow();
    expect(() => nullableText({ a: 1 }, 'a')).toThrow();
    expect(() => flag({ a: 'x' }, 'a')).toThrow();
    expect(nullableText({ a: null }, 'a')).toBeNull();
    expect(nullableText({}, 'a')).toBeNull();
  });

  test.each([
    [{ number: 2627 }, true],
    [{ number: 2601 }, true],
    [{ number: 547 }, false],
    [new Error('x'), false],
    [null, false],
    ['texto', false],
  ])('CT-SQL-03: erro %j de chave duplicada = %s', (error, expected) => {
    expect(isDuplicateKeyError(error)).toBe(expected);
  });
});

describe('repositórios SQL', () => {
  test('CT-SQL-10: valores nunca entram no texto SQL, só em parâmetros', async () => {
    const hostile = "x'; DROP TABLE member;--";
    const { executor, calls } = fakeDb();
    const repos = createSqlRepositories(executor);
    await repos.members.save(hostile, {
      id: hostile,
      name: hostile,
      birthDate: '2024-01-01',
      isPregnant: false,
      relationship: null,
    });
    await repos.members.get(hostile, hostile);
    await repos.auth.findAccountByEmail(hostile);
    for (const call of calls) {
      expect(call.text).not.toContain('DROP TABLE');
      expect(call.text).not.toContain(hostile);
    }
  });

  test('CT-SQL-11: toda consulta de membro e de dose limita ao dono (account_id)', async () => {
    const { executor, calls } = fakeDb();
    const repos = createSqlRepositories(executor);
    await repos.members.list('dono');
    await repos.members.get('dono', 'id');
    await repos.members.remove('dono', 'id');
    await repos.doses.listByMember('dono', 'm');
    await repos.doses.get('dono', 'd');
    await repos.doses.saveMany('dono', [
      {
        id: 'd',
        memberId: 'm',
        ruleId: 'r',
        status: 'PENDING',
        dueDate: '2026-12-01',
        scheduledDate: null,
        appliedDate: null,
      },
    ]);
    expect(calls).toHaveLength(6);
    for (const call of calls) expect(call.text).toContain('account_id = @owner');
  });

  test('CT-SQL-12: estado de dose fora dos cinco conhecidos lança erro', async () => {
    const row = {
      id: 'd',
      member_id: 'm',
      rule_id: 'r',
      status: 'INVENTADO',
      due_date: '2026-12-01',
      scheduled_date: null,
      applied_date: null,
    };
    const repos = createSqlRepositories(fakeDb([row]).executor);
    await expect(repos.doses.get('dono', 'd')).rejects.toThrow('Estado de dose inesperado.');
  });

  test('CT-SQL-13: e-mail repetido vira false; outro erro do banco é propagado', async () => {
    const account = {
      id: 'a',
      email: 'a@b.c',
      passwordHash: 'h',
      createdAt: '2026-10-07T12:00:00.000Z',
    };
    const duplicate = createSqlRepositories(fakeDb([], { number: 2627 }).executor);
    expect(await duplicate.auth.createAccount(account)).toBe(false);
    const broken = createSqlRepositories(fakeDb([], new Error('queda')).executor);
    await expect(broken.auth.createAccount(account)).rejects.toThrow('queda');
  });

  test('CT-SQL-14: consulta sem linhas devolve indefinido', async () => {
    const repos = createSqlRepositories(fakeDb([]).executor);
    expect(await repos.members.get('d', 'm')).toBeUndefined();
    expect(await repos.doses.get('d', 'x')).toBeUndefined();
    expect(await repos.consents.get('d')).toBeUndefined();
    expect(await repos.auth.findAccountById('a')).toBeUndefined();
    expect(await repos.auth.findRefreshToken('h')).toBeUndefined();
  });

  test('CT-SQL-20: candidatos ao e-mail só vêm de contas com consentimento e lembretes ligados', async () => {
    const { executor, calls } = fakeDb([
      {
        account_id: 'a1',
        email: 'a@b.c',
        status: 'PENDING',
        due_date: '2026-10-06',
        scheduled_date: null,
        applied_date: null,
      },
    ]);
    const repos = createSqlRepositories(executor);
    const found = await repos.reminders.listEmailCandidates('2026-10-06');
    expect(found).toEqual([
      {
        accountId: 'a1',
        email: 'a@b.c',
        dose: { status: 'PENDING', dueDate: '2026-10-06', scheduledDate: null, appliedDate: null },
      },
    ]);
    const sqlText = calls[0]?.text ?? '';
    expect(sqlText).toContain('reminders_enabled = 1');
    expect(sqlText).toContain('JOIN consent');
    expect(sqlText).toContain('reminder_log');
    expect(sqlText).not.toContain('2026-10-06');
  });

  test('CT-SQL-21: reservar o dia duas vezes devolve false; outro erro é propagado; soltar apaga', async () => {
    const duplicate = createSqlRepositories(fakeDb([], { number: 2627 }).executor);
    expect(await duplicate.reminders.claimEmailDay('a1', '2026-10-06')).toBe(false);
    const broken = createSqlRepositories(fakeDb([], new Error('queda')).executor);
    await expect(broken.reminders.claimEmailDay('a1', '2026-10-06')).rejects.toThrow('queda');
    const { executor, calls } = fakeDb();
    const repos = createSqlRepositories(executor);
    expect(await repos.reminders.claimEmailDay('a1', '2026-10-06')).toBe(true);
    await repos.reminders.releaseEmailDay('a1', '2026-10-06');
    expect(calls[1]?.text).toContain('DELETE FROM reminder_log');
  });

  test('CT-SQL-22: a preferência de e-mail é lida e gravada só para a conta do dono', async () => {
    const off = createSqlRepositories(fakeDb([{ reminders_enabled: false }]).executor);
    expect(await off.reminders.getEmailEnabled('a1')).toBe(false);
    const none = createSqlRepositories(fakeDb([]).executor);
    expect(await none.reminders.getEmailEnabled('a1')).toBe(true);
    const { executor, calls } = fakeDb();
    await createSqlRepositories(executor).reminders.setEmailEnabled('a1', false);
    expect(calls[0]?.text).toContain('WHERE id = @owner');
    expect(calls[0]?.params['enabled']).toEqual({ type: 'bit', value: false });
  });
});
