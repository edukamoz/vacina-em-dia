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
      kind: 'PERSON',
      species: null,
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

describe('repositórios SQL: dose que se repete (B69)', () => {
  const linhaBase = {
    id: 'd2',
    member_id: 'm',
    rule_id: null,
    custom_vaccine: 'Gripe',
    custom_dose_label: 'Anual',
    status: 'PENDING',
    due_date: '2027-11-04',
    scheduled_date: null,
    applied_date: null,
  };

  test('CT-REC-120: lê a repetição, a série, o número da dose e o aviso antecipado', async () => {
    const repos = createSqlRepositories(
      fakeDb([
        {
          ...linhaBase,
          remind_days_before: 14,
          series_id: 's1',
          occurrence: 2,
          recur_unit: 'YEAR',
          recur_every: 1,
          recur_anchor: 'SCHEDULE',
          recur_anchor_date: '2026-11-04',
          recur_end_date: '2035-11-04',
          recur_max_doses: 5,
        },
      ]).executor,
    );
    expect(await repos.doses.get('dono', 'd2')).toMatchObject({
      remindDaysBefore: 14,
      seriesId: 's1',
      occurrence: 2,
      recurrence: {
        unit: 'YEAR',
        every: 1,
        anchor: 'SCHEDULE',
        anchorDate: '2026-11-04',
        endDate: '2035-11-04',
        maxDoses: 5,
      },
    });
  });

  test('CT-REC-121: dose sem repetição não ganha os campos novos', async () => {
    const repos = createSqlRepositories(fakeDb([linhaBase]).executor);
    const dose = await repos.doses.get('dono', 'd2');
    expect(dose).toBeDefined();
    expect(dose).not.toHaveProperty('recurrence');
    expect(dose).not.toHaveProperty('seriesId');
    expect(dose).not.toHaveProperty('remindDaysBefore');
  });

  test('CT-REC-122: unidade de repetição desconhecida lança erro', async () => {
    const repos = createSqlRepositories(
      fakeDb([
        {
          ...linhaBase,
          series_id: 's1',
          occurrence: 1,
          recur_unit: 'HORA',
          recur_every: 1,
          recur_anchor: 'APPLICATION',
          recur_anchor_date: '2026-11-04',
          recur_end_date: null,
          recur_max_doses: null,
        },
      ]).executor,
    );
    await expect(repos.doses.get('dono', 'd2')).rejects.toThrow('Repetição de dose inesperada.');
  });

  test('CT-REC-123: grava a repetição só em parâmetros e limitada ao dono', async () => {
    const { executor, calls } = fakeDb();
    await createSqlRepositories(executor).doses.saveMany('dono', [
      {
        id: 'd2',
        memberId: 'm',
        ruleId: null,
        custom: { vaccine: 'Gripe', doseLabel: 'Anual' },
        status: 'PENDING',
        dueDate: '2027-11-04',
        scheduledDate: null,
        appliedDate: null,
        remindDaysBefore: 14,
        seriesId: 's1',
        occurrence: 2,
        recurrence: {
          unit: 'YEAR',
          every: 1,
          anchor: 'SCHEDULE',
          anchorDate: '2026-11-04',
          endDate: null,
          maxDoses: 5,
        },
      },
    ]);
    const call = calls[0];
    expect(call?.text).toContain('account_id = @owner');
    expect(call?.text).not.toContain('Gripe');
    expect(call?.params['unit']).toEqual({ type: 'varchar', value: 'YEAR', length: 5 });
    expect(call?.params['every']).toEqual({ type: 'int', value: 1 });
    expect(call?.params['remind']).toEqual({ type: 'int', value: 14 });
    expect(call?.params['series']).toEqual({ type: 'varchar', value: 's1', length: 64 });
    expect(call?.params['occurrence']).toEqual({ type: 'int', value: 2 });
    expect(call?.params['maxDoses']).toEqual({ type: 'int', value: 5 });
    expect(call?.params['anchorDate']).toEqual({
      type: 'varchar',
      value: '2026-11-04',
      length: 10,
    });
  });

  test('CT-REC-124: ao encerrar a série, os campos da repetição são gravados como nulos', async () => {
    const { executor, calls } = fakeDb();
    await createSqlRepositories(executor).doses.saveMany('dono', [
      {
        id: 'd2',
        memberId: 'm',
        ruleId: null,
        custom: { vaccine: 'Gripe', doseLabel: 'Anual' },
        status: 'CANCELLED',
        dueDate: '2027-11-04',
        scheduledDate: null,
        appliedDate: null,
        recurrence: null,
        seriesId: 's1',
        occurrence: 2,
      },
    ]);
    const params = calls[0]?.params ?? {};
    expect(params['unit']).toEqual({ type: 'varchar', value: null, length: 5 });
    expect(params['every']).toEqual({ type: 'int', value: null });
    expect(params['anchorDate']).toEqual({ type: 'varchar', value: null, length: 10 });
    expect(params['remind']).toEqual({ type: 'int', value: null });
  });

  test('CT-REC-125: os candidatos ao e-mail respeitam o aviso antecipado de cada dose', async () => {
    const { executor, calls } = fakeDb([
      {
        account_id: 'a1',
        email: 'a@b.c',
        status: 'PENDING',
        due_date: '2026-10-09',
        scheduled_date: null,
        applied_date: null,
        remind_days_before: 3,
      },
    ]);
    const found = await createSqlRepositories(executor).reminders.listEmailCandidates('2026-10-06');
    expect(found[0]?.dose).toMatchObject({ remindDaysBefore: 3, dueDate: '2026-10-09' });
    const call = calls[0];
    expect(call?.text).toContain('COALESCE(d.remind_days_before, @lead)');
    expect(call?.params['lead']).toEqual({ type: 'int', value: 7 });
  });
});

describe('repositórios SQL: família com vários responsáveis (B15)', () => {
  test('CT-FAMR-60: os candidatos ao e-mail vêm das pessoas da família da conta', async () => {
    const { executor, calls } = fakeDb();
    await createSqlRepositories(executor).reminders.listEmailCandidates('2026-11-10');
    const texto = calls[0]?.text ?? '';
    expect(texto).toContain('JOIN family_membership fm ON fm.account_id = a.id');
    expect(texto).toContain('JOIN member m ON m.family_id = fm.family_id');
    expect(texto).not.toMatch(/\bm\.account_id/);
  });

  test('CT-FAMR-61: criar a conta cria a família e o vínculo de dono na mesma transação', async () => {
    const { executor, calls } = fakeDb();
    let n = 0;
    const repos = createSqlRepositories(executor, () => `id-${(n += 1)}`);
    expect(
      await repos.auth.createAccount({
        id: 'conta-1',
        email: 'a@b.c',
        passwordHash: 'h',
        createdAt: '2026-11-10T12:00:00.000Z',
      }),
    ).toBe(true);
    expect(calls).toHaveLength(3);
    expect(calls[0]?.text).toContain('INSERT INTO app_account');
    expect(calls[1]?.text).toContain('INSERT INTO family (id)');
    expect(calls[2]?.text).toContain('INSERT INTO family_membership');
    expect(calls[2]?.text).toContain("'OWNER'");
    expect(calls[2]?.params['account']).toEqual({ type: 'varchar', value: 'conta-1', length: 64 });
  });

  test('CT-FAMR-62: valores hostis nunca entram no texto SQL das operações de família', async () => {
    const hostil = "x'; DROP TABLE family;--";
    const { executor, calls } = fakeDb([
      {
        id: 'v',
        family_id: 'f',
        role: 'OWNER',
        guardians: 1,
        members: 0,
        account_id: 'a',
        joined_at: '2026-11-10T12:00:00',
      },
    ]);
    const repos = createSqlRepositories(executor);
    await repos.households.createInvite({
      tokenHash: hostil,
      householdId: hostil,
      createdByAccountId: hostil,
      expiresAt: '2026-11-17T12:00:00.000Z',
    });
    await repos.households.revokeInvites(hostil);
    await repos.households.countActiveInvites(hostil, '2026-11-10T12:00:00.000Z');
    await repos.households.join(hostil, hostil, '2026-11-10T12:00:00.000Z', true);
    await repos.households.remove(hostil, hostil);
    await repos.households.transfer(hostil, hostil);
    for (const call of calls) {
      expect(call.text).not.toContain('DROP TABLE');
      expect(call.text).not.toContain(hostil);
    }
  });

  test('CT-FAMR-63: ao excluir a conta, só a única da família apaga a família inteira', async () => {
    const sozinha = fakeDb([{ family_id: 'f', role: 'OWNER', n: 1 }]);
    await createSqlRepositories(sozinha.executor).accounts.deleteAll('conta');
    expect(
      sozinha.calls.some((c) => c.text.includes('DELETE FROM family WHERE id = @family')),
    ).toBe(true);

    const dividida = fakeDb([{ family_id: 'f', role: 'GUARDIAN', n: 2 }]);
    await createSqlRepositories(dividida.executor).accounts.deleteAll('conta');
    expect(dividida.calls.some((c) => c.text.includes('DELETE FROM family WHERE'))).toBe(false);
    expect(dividida.calls.some((c) => c.text.includes('DELETE FROM family_membership'))).toBe(true);
  });
});
