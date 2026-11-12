import { randomUUID } from 'node:crypto';
import {
  RECURRENCE_ANCHORS,
  RECURRENCE_UNITS,
  MAX_REMIND_DAYS_BEFORE,
  type DoseStatus,
  type RecurrenceAnchor,
  type RecurrenceRule,
  type RecurrenceUnit,
  type Relationship,
  type Species,
} from '@vacina/shared';
import type {
  AccountRepository,
  AuthRepository,
  ConsentRepository,
  DoseRepository,
  HouseholdRepository,
  HouseholdRole,
  MemberRepository,
  ReminderRepository,
  StoredAccount,
  StoredDose,
  StoredPasswordResetToken,
  StoredMember,
  StoredRefreshToken,
} from '../repositories';
import {
  flag,
  instant,
  isDuplicateKeyError,
  isoUtc,
  nullableNumber,
  nullableText,
  text,
  type SqlExecutor,
  type SqlRow,
} from './sql-executor';

/** Repositórios sobre o Azure SQL. Todas as consultas são parametrizadas e limitadas ao dono. */
export interface SqlRepositories {
  readonly members: MemberRepository;
  readonly doses: DoseRepository;
  readonly consents: ConsentRepository;
  readonly accounts: AccountRepository;
  readonly reminders: ReminderRepository;
  readonly households: HouseholdRepository;
  readonly auth: AuthRepository;
  /** Consulta mínima que acorda o banco pausado (Azure SQL gratuito) e confirma que responde. */
  readonly ping: () => Promise<void>;
}

const DOSE_STATUSES: readonly string[] = [
  'PENDING',
  'SCHEDULED',
  'OVERDUE',
  'APPLIED',
  'CANCELLED',
];

const str = (value: string, length = 64) => ({ type: 'varchar', value, length }) as const;
const nstr = (value: string, length: number) => ({ type: 'nvarchar', value, length }) as const;
const nullableStr = (value: string | null, length: number) =>
  ({ type: 'varchar', value, length }) as const;
const nullableNstr = (value: string | null, length: number) =>
  ({ type: 'nvarchar', value, length }) as const;
const nullableInt = (value: number | null) => ({ type: 'int', value }) as const;

/** Instante ISO 8601 (UTC) como parâmetro; o banco converte para DATETIME2 com o estilo 127. */
const when = (value: string) => str(value, 30);

const MEMBER_COLUMNS = `m.id, m.display_name, CONVERT(char(10), m.birth_date, 23) AS birth_date, m.is_pregnant, m.relationship,
  m.kind, m.species`;

/** Junção que dá a uma conta o acesso às pessoas da família dela (ADR-029). */
const FAMILY_ACCESS = 'JOIN family_membership fm ON fm.family_id = m.family_id';

/** Parentesco guardado; `null` quando não informado. O banco só aceita os códigos conhecidos. */
function relationshipOf(row: SqlRow): Relationship | null {
  const value = row['relationship'];
  return typeof value === 'string' ? (value as Relationship) : null;
}

/** Espécie guardada; `null` para pessoa. O banco só aceita os códigos conhecidos. */
function speciesOf(row: SqlRow): Species | null {
  const value = row['species'];
  return typeof value === 'string' ? (value as Species) : null;
}

function toMember(row: SqlRow): StoredMember {
  return {
    id: text(row, 'id'),
    name: text(row, 'display_name'),
    birthDate: text(row, 'birth_date'),
    isPregnant: flag(row, 'is_pregnant'),
    relationship: relationshipOf(row),
    kind: row['kind'] === 'PET' ? 'PET' : 'PERSON',
    species: speciesOf(row),
  };
}

const DOSE_COLUMNS = `d.id, d.member_id, d.rule_id, d.custom_vaccine, d.custom_dose_label, d.status,
  d.remind_days_before, d.remind_days, d.series_id, d.occurrence, d.recur_unit, d.recur_every, d.recur_anchor,
  d.recur_max_doses,
  CONVERT(char(10), d.due_date, 23) AS due_date,
  CONVERT(char(10), d.scheduled_date, 23) AS scheduled_date,
  CONVERT(char(10), d.applied_date, 23) AS applied_date,
  CONVERT(char(10), d.recur_anchor_date, 23) AS recur_anchor_date,
  CONVERT(char(10), d.recur_end_date, 23) AS recur_end_date`;

/** Regra de repetição da linha, ou `null` quando a dose não se repete (campos `recur_*` nulos). */
function recurrenceOf(row: SqlRow): RecurrenceRule | null {
  const unit = nullableText(row, 'recur_unit');
  if (unit === null) return null;
  const anchor = text(row, 'recur_anchor');
  const every = nullableNumber(row, 'recur_every');
  if (
    !(RECURRENCE_UNITS as readonly string[]).includes(unit) ||
    !(RECURRENCE_ANCHORS as readonly string[]).includes(anchor) ||
    every === null
  ) {
    throw new Error('Repetição de dose inesperada.');
  }
  return {
    unit: unit as RecurrenceUnit,
    every,
    anchor: anchor as RecurrenceAnchor,
    anchorDate: text(row, 'recur_anchor_date'),
    endDate: nullableText(row, 'recur_end_date'),
    maxDoses: nullableNumber(row, 'recur_max_doses'),
  };
}

/** Lê as antecedências guardadas como texto ('7,3,0'); texto vazio ou inválido vira `null`. */
function parseRemindDays(value: string | null): number[] | null {
  if (!value) return null;
  const lista = value.split(',').map(Number);
  return lista.every((n) => Number.isInteger(n) && n >= 0) ? lista : null;
}

function toDose(row: SqlRow): StoredDose {
  const status = text(row, 'status');
  if (!DOSE_STATUSES.includes(status)) throw new Error('Estado de dose inesperado.');
  const ruleId = nullableText(row, 'rule_id');
  const customVaccine = nullableText(row, 'custom_vaccine');
  const remindDaysBefore = nullableNumber(row, 'remind_days_before');
  const remindDays = parseRemindDays(nullableText(row, 'remind_days'));
  const seriesId = nullableText(row, 'series_id');
  const recurrence = recurrenceOf(row);
  return {
    id: text(row, 'id'),
    memberId: text(row, 'member_id'),
    ruleId,
    // Só a dose avulsa tem `custom`; a oficial não traz a chave, como no repositório em memória.
    ...(ruleId === null && customVaccine !== null
      ? { custom: { vaccine: customVaccine, doseLabel: text(row, 'custom_dose_label') } }
      : {}),
    status: status as DoseStatus,
    dueDate: text(row, 'due_date'),
    scheduledDate: nullableText(row, 'scheduled_date'),
    appliedDate: nullableText(row, 'applied_date'),
    ...(remindDaysBefore === null ? {} : { remindDaysBefore }),
    ...(remindDays === null ? {} : { remindDays }),
    ...(seriesId === null ? {} : { seriesId, occurrence: nullableNumber(row, 'occurrence') }),
    ...(recurrence === null ? {} : { recurrence }),
  };
}

function toAccount(row: SqlRow): StoredAccount {
  return {
    id: text(row, 'id'),
    email: text(row, 'email'),
    passwordHash: text(row, 'password_hash'),
    createdAt: instant(row, 'created_at'),
  };
}

function toRefreshToken(row: SqlRow): StoredRefreshToken {
  const revokedAt = nullableText(row, 'revoked_at');
  return {
    tokenHash: text(row, 'token_hash'),
    accountId: text(row, 'account_id'),
    expiresAt: instant(row, 'expires_at'),
    ...(revokedAt === null ? {} : { revokedAt: isoUtc(revokedAt) }),
  };
}

/**
 * Cria os repositórios sobre o Azure SQL. O "dono" que chega a cada método é uma conta, e o acesso
 * passa sempre pelo vínculo dela com a família (`family_membership`): uma pessoa só é alcançada
 * pelas contas da família dela, e uma dose só é alcançada pela pessoa, então ninguém lê nem grava
 * dado de outra família (ADR-029; CLAUDE.md §10).
 *
 * @param db - Executor de consultas (a porta; em produção, o `mssql`).
 * @param newId - Gerador de identificadores da família e do vínculo, injetável para testar.
 */
export function createSqlRepositories(
  db: SqlExecutor,
  newId: () => string = randomUUID,
): SqlRepositories {
  const members: MemberRepository = {
    async list(ownerId) {
      const result = await db.run(
        `SELECT ${MEMBER_COLUMNS} FROM member m ${FAMILY_ACCESS}
         WHERE fm.account_id = @owner ORDER BY m.seq`,
        { owner: str(ownerId) },
      );
      return result.rows.map(toMember);
    },
    async get(ownerId, id) {
      const result = await db.run(
        `SELECT ${MEMBER_COLUMNS} FROM member m ${FAMILY_ACCESS}
         WHERE fm.account_id = @owner AND m.id = @id`,
        { owner: str(ownerId), id: str(id) },
      );
      const row = result.rows[0];
      return row ? toMember(row) : undefined;
    },
    async save(ownerId, member) {
      await db.run(
        `UPDATE m SET display_name = @name, birth_date = CONVERT(date, @birth, 23),
           is_pregnant = @pregnant, relationship = @relationship, kind = @kind, species = @species
         FROM member m ${FAMILY_ACCESS}
         WHERE m.id = @id AND fm.account_id = @owner;
         IF @@ROWCOUNT = 0
           INSERT INTO member (id, account_id, family_id, display_name, birth_date, is_pregnant,
             relationship, kind, species)
           SELECT @id, @owner, fm.family_id, @name, CONVERT(date, @birth, 23), @pregnant,
             @relationship, @kind, @species
           FROM family_membership fm WHERE fm.account_id = @owner;`,
        {
          id: str(member.id),
          owner: str(ownerId),
          name: nstr(member.name, 80),
          birth: str(member.birthDate, 10),
          pregnant: { type: 'bit', value: member.isPregnant },
          relationship: { type: 'varchar', value: member.relationship, length: 20 },
          kind: str(member.kind),
          species: { type: 'varchar', value: member.species, length: 10 },
        },
      );
    },
    async remove(ownerId, id) {
      await db.run(
        `DELETE m FROM member m ${FAMILY_ACCESS} WHERE m.id = @id AND fm.account_id = @owner`,
        { id: str(id), owner: str(ownerId) },
      );
    },
  };

  const doses: DoseRepository = {
    async listByMember(ownerId, memberId) {
      const result = await db.run(
        `SELECT ${DOSE_COLUMNS} FROM dose d JOIN member m ON m.id = d.member_id
         ${FAMILY_ACCESS} WHERE fm.account_id = @owner AND d.member_id = @member ORDER BY d.seq`,
        { owner: str(ownerId), member: str(memberId) },
      );
      return result.rows.map(toDose);
    },
    async get(ownerId, id) {
      const result = await db.run(
        `SELECT ${DOSE_COLUMNS} FROM dose d JOIN member m ON m.id = d.member_id
         ${FAMILY_ACCESS} WHERE fm.account_id = @owner AND d.id = @id`,
        { owner: str(ownerId), id: str(id) },
      );
      const row = result.rows[0];
      return row ? toDose(row) : undefined;
    },
    async saveMany(ownerId, list) {
      await db.transaction(async (tx) => {
        for (const dose of list) {
          const recurrence = dose.recurrence ?? null;
          await tx.run(
            `UPDATE d SET status = @status, due_date = CONVERT(date, @due, 23),
               scheduled_date = CONVERT(date, @scheduled, 23), applied_date = CONVERT(date, @applied, 23),
               remind_days_before = @remind, remind_days = @remindDays, series_id = @series, occurrence = @occurrence,
               recur_unit = @unit, recur_every = @every, recur_anchor = @anchor,
               recur_anchor_date = CONVERT(date, @anchorDate, 23),
               recur_end_date = CONVERT(date, @endDate, 23), recur_max_doses = @maxDoses
             FROM dose d JOIN member m ON m.id = d.member_id ${FAMILY_ACCESS}
             WHERE d.id = @id AND fm.account_id = @owner;
             IF @@ROWCOUNT = 0
               INSERT INTO dose (id, member_id, rule_id, custom_vaccine, custom_dose_label, status,
                 due_date, scheduled_date, applied_date, remind_days_before, remind_days, series_id, occurrence,
                 recur_unit, recur_every, recur_anchor, recur_anchor_date, recur_end_date,
                 recur_max_doses)
               SELECT @id, m.id, @rule, @customVaccine, @customDoseLabel, @status, CONVERT(date, @due, 23),
                 CONVERT(date, @scheduled, 23), CONVERT(date, @applied, 23), @remind, @remindDays, @series,
                 @occurrence, @unit, @every, @anchor, CONVERT(date, @anchorDate, 23),
                 CONVERT(date, @endDate, 23), @maxDoses
               FROM member m ${FAMILY_ACCESS} WHERE m.id = @member AND fm.account_id = @owner;`,
            {
              id: str(dose.id),
              owner: str(ownerId),
              member: str(dose.memberId),
              rule: nullableStr(dose.ruleId, 80),
              customVaccine: nullableNstr(dose.custom?.vaccine ?? null, 80),
              customDoseLabel: nullableNstr(dose.custom?.doseLabel ?? null, 40),
              status: str(dose.status, 10),
              due: str(dose.dueDate, 10),
              scheduled: nullableStr(dose.scheduledDate, 10),
              applied: nullableStr(dose.appliedDate, 10),
              remind: nullableInt(dose.remindDaysBefore ?? null),
              remindDays: nullableStr(dose.remindDays?.join(',') ?? null, 40),
              series: nullableStr(dose.seriesId ?? null, 64),
              occurrence: nullableInt(dose.occurrence ?? null),
              unit: nullableStr(recurrence?.unit ?? null, 5),
              every: nullableInt(recurrence?.every ?? null),
              anchor: nullableStr(recurrence?.anchor ?? null, 11),
              anchorDate: nullableStr(recurrence?.anchorDate ?? null, 10),
              endDate: nullableStr(recurrence?.endDate ?? null, 10),
              maxDoses: nullableInt(recurrence?.maxDoses ?? null),
            },
          );
        }
      });
    },
  };

  const consents: ConsentRepository = {
    async get(ownerId) {
      const result = await db.run(
        `SELECT term_version, CONVERT(char(23), accepted_at, 127) AS accepted_at, guardian_declaration
         FROM consent WHERE account_id = @owner`,
        { owner: str(ownerId) },
      );
      const row = result.rows[0];
      return row
        ? {
            termVersion: text(row, 'term_version'),
            acceptedAt: instant(row, 'accepted_at'),
            guardianDeclaration: flag(row, 'guardian_declaration'),
          }
        : undefined;
    },
    async save(ownerId, consent) {
      await db.run(
        `UPDATE consent SET term_version = @version, accepted_at = CONVERT(datetime2(3), @at, 127),
           guardian_declaration = @guardian WHERE account_id = @owner;
         IF @@ROWCOUNT = 0
           INSERT INTO consent (account_id, term_version, accepted_at, guardian_declaration)
           VALUES (@owner, @version, CONVERT(datetime2(3), @at, 127), @guardian);`,
        {
          owner: str(ownerId),
          version: str(consent.termVersion, 20),
          at: when(consent.acceptedAt),
          guardian: { type: 'bit', value: consent.guardianDeclaration },
        },
      );
    },
  };

  const accounts: AccountRepository = {
    async deleteAll(ownerId) {
      await db.transaction(async (tx) => {
        const mine = await tx.run(
          'SELECT family_id, role FROM family_membership WHERE account_id = @owner',
          { owner: str(ownerId) },
        );
        const row = mine.rows[0];
        if (row) {
          const familyId = text(row, 'family_id');
          const count = await tx.run(
            'SELECT COUNT(*) AS n FROM family_membership WHERE family_id = @family',
            { family: str(familyId) },
          );
          if ((nullableNumber(count.rows[0] ?? {}, 'n') ?? 0) <= 1) {
            // A única conta: apaga a família inteira (pessoas, doses e convites, em cascata).
            await tx.run('DELETE FROM family WHERE id = @family', { family: str(familyId) });
          } else {
            // Divide a família: só sai dela. Se era a dona, a propriedade passa ao mais antigo.
            if (text(row, 'role') === 'OWNER') {
              await tx.run(
                `UPDATE family_membership SET role = 'OWNER'
                 WHERE id = (SELECT TOP 1 id FROM family_membership
                             WHERE family_id = @family AND account_id <> @owner
                             ORDER BY joined_at, id)`,
                { family: str(familyId), owner: str(ownerId) },
              );
            }
            await tx.run('DELETE FROM family_membership WHERE account_id = @owner', {
              owner: str(ownerId),
            });
          }
        }
        await tx.run('DELETE FROM consent WHERE account_id = @owner', { owner: str(ownerId) });
      });
    },
  };

  const reminders: ReminderRepository = {
    async getEmailEnabled(ownerId) {
      const result = await db.run('SELECT reminders_enabled FROM app_account WHERE id = @owner', {
        owner: str(ownerId),
      });
      const row = result.rows[0];
      return row ? flag(row, 'reminders_enabled') : true;
    },
    async setEmailEnabled(ownerId, enabled) {
      await db.run('UPDATE app_account SET reminders_enabled = @enabled WHERE id = @owner', {
        enabled: { type: 'bit', value: enabled },
        owner: str(ownerId),
      });
    },
    async listEmailCandidates(today) {
      const result = await db.run(
        `SELECT a.id AS account_id, a.email, d.status, d.remind_days_before, d.remind_days,
           CONVERT(char(10), d.due_date, 23) AS due_date,
           CONVERT(char(10), d.scheduled_date, 23) AS scheduled_date,
           CONVERT(char(10), d.applied_date, 23) AS applied_date
         FROM app_account a
         JOIN consent c ON c.account_id = a.id
         JOIN family_membership fm ON fm.account_id = a.id
         JOIN member m ON m.family_id = fm.family_id
         JOIN dose d ON d.member_id = m.id
         WHERE a.reminders_enabled = 1
           AND d.status IN ('PENDING', 'SCHEDULED')
           AND COALESCE(CASE WHEN d.status = 'SCHEDULED' THEN d.scheduled_date END, d.due_date)
             BETWEEN CONVERT(date, @today, 23) AND DATEADD(day, @maxLead, CONVERT(date, @today, 23))
           AND NOT EXISTS (
             SELECT 1 FROM reminder_log r WHERE r.account_id = a.id AND r.sent_on = CONVERT(date, @today, 23)
           )
         ORDER BY a.id`,
        { today: str(today, 10), maxLead: nullableInt(MAX_REMIND_DAYS_BEFORE) },
      );
      return result.rows.map((row) => ({
        accountId: text(row, 'account_id'),
        email: text(row, 'email'),
        dose: {
          status: text(row, 'status') as DoseStatus,
          dueDate: text(row, 'due_date'),
          scheduledDate: nullableText(row, 'scheduled_date'),
          appliedDate: nullableText(row, 'applied_date'),
          ...(nullableNumber(row, 'remind_days_before') === null
            ? {}
            : { remindDaysBefore: nullableNumber(row, 'remind_days_before') }),
          ...(parseRemindDays(nullableText(row, 'remind_days')) === null
            ? {}
            : { remindDays: parseRemindDays(nullableText(row, 'remind_days')) }),
        },
      }));
    },
    async claimEmailDay(accountId, today) {
      try {
        await db.run(
          'INSERT INTO reminder_log (account_id, sent_on) VALUES (@account, CONVERT(date, @today, 23))',
          { account: str(accountId), today: str(today, 10) },
        );
        return true;
      } catch (error) {
        if (isDuplicateKeyError(error)) return false;
        throw error;
      }
    },
    async releaseEmailDay(accountId, today) {
      await db.run(
        'DELETE FROM reminder_log WHERE account_id = @account AND sent_on = CONVERT(date, @today, 23)',
        { account: str(accountId), today: str(today, 10) },
      );
    },
  };

  const accountColumns = `id, email, password_hash, CONVERT(char(23), created_at, 127) AS created_at`;
  const auth: AuthRepository = {
    async createAccount(account) {
      try {
        await db.transaction(async (tx) => {
          await tx.run(
            `INSERT INTO app_account (id, email, password_hash, created_at)
             VALUES (@id, @email, @hash, CONVERT(datetime2(3), @at, 127))`,
            {
              id: str(account.id),
              email: nstr(account.email, 254),
              hash: str(account.passwordHash, 200),
              at: when(account.createdAt),
            },
          );
          // Toda conta nasce dona de uma família própria (ADR-029).
          const family = newId();
          await tx.run('INSERT INTO family (id) VALUES (@family)', { family: str(family) });
          await tx.run(
            `INSERT INTO family_membership (id, family_id, account_id, role)
             VALUES (@membership, @family, @account, 'OWNER')`,
            { membership: str(newId()), family: str(family), account: str(account.id) },
          );
        });
        return true;
      } catch (error) {
        if (isDuplicateKeyError(error)) return false;
        throw error;
      }
    },
    async findAccountByEmail(email) {
      const result = await db.run(
        `SELECT ${accountColumns} FROM app_account WHERE email = @email`,
        {
          email: nstr(email, 254),
        },
      );
      const row = result.rows[0];
      return row ? toAccount(row) : undefined;
    },
    async findAccountById(id) {
      const result = await db.run(`SELECT ${accountColumns} FROM app_account WHERE id = @id`, {
        id: str(id),
      });
      const row = result.rows[0];
      return row ? toAccount(row) : undefined;
    },
    async saveRefreshToken(token) {
      await db.run(
        `INSERT INTO refresh_token (token_hash, account_id, expires_at)
         VALUES (@hash, @account, CONVERT(datetime2(3), @expires, 127))`,
        {
          hash: str(token.tokenHash, 64),
          account: str(token.accountId),
          expires: when(token.expiresAt),
        },
      );
    },
    async findRefreshToken(tokenHash) {
      const result = await db.run(
        `SELECT token_hash, account_id, CONVERT(char(23), expires_at, 127) AS expires_at,
           CONVERT(char(23), revoked_at, 127) AS revoked_at
         FROM refresh_token WHERE token_hash = @hash`,
        { hash: str(tokenHash, 64) },
      );
      const row = result.rows[0];
      return row ? toRefreshToken(row) : undefined;
    },
    async revokeRefreshToken(tokenHash, at) {
      await db.run(
        `UPDATE refresh_token SET revoked_at = CONVERT(datetime2(3), @at, 127)
         WHERE token_hash = @hash AND revoked_at IS NULL`,
        { hash: str(tokenHash, 64), at: when(at) },
      );
    },
    async revokeAllRefreshTokens(accountId, at) {
      await db.run(
        `UPDATE refresh_token SET revoked_at = CONVERT(datetime2(3), @at, 127)
         WHERE account_id = @account AND revoked_at IS NULL`,
        { account: str(accountId), at: when(at) },
      );
    },
    async savePasswordResetToken(token) {
      await db.run(
        `INSERT INTO password_reset_token (token_hash, account_id, expires_at)
         VALUES (@hash, @account, CONVERT(datetime2(3), @expires, 127))`,
        {
          hash: str(token.tokenHash, 64),
          account: str(token.accountId),
          expires: when(token.expiresAt),
        },
      );
    },
    async findPasswordResetToken(tokenHash) {
      const result = await db.run(
        `SELECT token_hash, account_id, CONVERT(char(23), expires_at, 127) AS expires_at,
           CONVERT(char(23), used_at, 127) AS used_at
         FROM password_reset_token WHERE token_hash = @hash`,
        { hash: str(tokenHash, 64) },
      );
      const row = result.rows[0];
      if (!row) return undefined;
      const usedAt = nullableText(row, 'used_at');
      const token: StoredPasswordResetToken = {
        tokenHash: text(row, 'token_hash'),
        accountId: text(row, 'account_id'),
        expiresAt: instant(row, 'expires_at'),
        ...(usedAt === null ? {} : { usedAt: isoUtc(usedAt) }),
      };
      return token;
    },
    async consumePasswordResetToken(tokenHash, at) {
      const result = await db.run(
        `UPDATE password_reset_token SET used_at = CONVERT(datetime2(3), @at, 127)
         WHERE token_hash = @hash AND used_at IS NULL`,
        { hash: str(tokenHash, 64), at: when(at) },
      );
      return result.rowsAffected > 0;
    },
    async updatePasswordHash(accountId, passwordHash) {
      await db.run('UPDATE app_account SET password_hash = @hash WHERE id = @id', {
        hash: str(passwordHash, 200),
        id: str(accountId),
      });
    },
    async deleteAccount(id) {
      await db.run('DELETE FROM app_account WHERE id = @id', { id: str(id) });
    },
  };

  /** Garante que a conta tem família: cria a própria, com a conta como dona, se ainda não tiver. */
  async function ensureHousehold(tx: SqlExecutor, accountId: string): Promise<void> {
    const found = await tx.run(
      'SELECT 1 AS ok FROM family_membership WHERE account_id = @account',
      {
        account: str(accountId),
      },
    );
    if (found.rows.length > 0) return;
    const family = newId();
    await tx.run('INSERT INTO family (id) VALUES (@family)', { family: str(family) });
    await tx.run(
      `INSERT INTO family_membership (id, family_id, account_id, role)
       VALUES (@membership, @family, @account, 'OWNER')`,
      { membership: str(newId()), family: str(family), account: str(accountId) },
    );
  }

  /** Cria uma família nova e vazia, dona a conta (depois de sair ou ser removida da anterior). */
  async function startOver(tx: SqlExecutor, accountId: string): Promise<void> {
    const family = newId();
    await tx.run('INSERT INTO family (id) VALUES (@family)', { family: str(family) });
    await tx.run(
      `INSERT INTO family_membership (id, family_id, account_id, role)
       VALUES (@membership, @family, @account, 'OWNER')`,
      { membership: str(newId()), family: str(family), account: str(accountId) },
    );
  }

  /** Vínculo da conta: família, papel e quantos responsáveis a família tem. */
  async function mineOf(tx: SqlExecutor, accountId: string) {
    const result = await tx.run(
      `SELECT fm.id, fm.family_id, fm.role,
         (SELECT COUNT(*) FROM family_membership x WHERE x.family_id = fm.family_id) AS guardians,
         (SELECT COUNT(*) FROM member m WHERE m.family_id = fm.family_id) AS members
       FROM family_membership fm WHERE fm.account_id = @account`,
      { account: str(accountId) },
    );
    const row = result.rows[0];
    if (!row) throw new Error('Conta sem família.');
    return {
      id: text(row, 'id'),
      familyId: text(row, 'family_id'),
      role: text(row, 'role') as HouseholdRole,
      guardians: nullableNumber(row, 'guardians') ?? 0,
      members: nullableNumber(row, 'members') ?? 0,
    };
  }

  const households: HouseholdRepository = {
    async get(accountId) {
      try {
        await db.transaction((tx) => ensureHousehold(tx, accountId));
      } catch (error) {
        // Duas chamadas ao mesmo tempo: a outra criou a família; basta ler.
        if (!isDuplicateKeyError(error)) throw error;
      }
      const mine = await mineOf(db, accountId);
      const result = await db.run(
        `SELECT id, account_id, role, CONVERT(char(23), joined_at, 127) AS joined_at
         FROM family_membership WHERE family_id = @family ORDER BY joined_at, id`,
        { family: str(mine.familyId) },
      );
      return {
        id: mine.familyId,
        memberCount: mine.members,
        guardians: result.rows.map((row) => ({
          id: text(row, 'id'),
          accountId: text(row, 'account_id'),
          role: text(row, 'role') as HouseholdRole,
          joinedAt: instant(row, 'joined_at'),
        })),
      };
    },
    async countActiveInvites(householdId, nowIso) {
      const result = await db.run(
        `SELECT COUNT(*) AS n FROM family_invite
         WHERE family_id = @family AND used_at IS NULL
           AND expires_at > CONVERT(datetime2(3), @now, 127)`,
        { family: str(householdId), now: when(nowIso) },
      );
      return nullableNumber(result.rows[0] ?? {}, 'n') ?? 0;
    },
    async createInvite(invite) {
      await db.run(
        `INSERT INTO family_invite (token_hash, family_id, created_by_account_id, expires_at)
         VALUES (@hash, @family, @creator, CONVERT(datetime2(3), @expires, 127))`,
        {
          hash: str(invite.tokenHash, 64),
          family: str(invite.householdId),
          creator: str(invite.createdByAccountId),
          expires: when(invite.expiresAt),
        },
      );
    },
    async revokeInvites(householdId) {
      await db.run('DELETE FROM family_invite WHERE family_id = @family AND used_at IS NULL', {
        family: str(householdId),
      });
    },
    async join(accountId, tokenHash, nowIso, moveMembers) {
      return db.transaction(async (tx) => {
        await ensureHousehold(tx, accountId);
        const invite = await tx.run(
          `SELECT family_id FROM family_invite
           WHERE token_hash = @hash AND used_at IS NULL
             AND expires_at > CONVERT(datetime2(3), @now, 127)`,
          { hash: str(tokenHash, 64), now: when(nowIso) },
        );
        const target = invite.rows[0] ? text(invite.rows[0], 'family_id') : undefined;
        if (!target) return { status: 'INVALID' } as const;
        const mine = await mineOf(tx, accountId);
        if (mine.familyId === target) return { status: 'ALREADY_MEMBER' } as const;
        if (mine.guardians > 1) return { status: 'NOT_ALONE' } as const;
        if (mine.members > 0 && !moveMembers) {
          return { status: 'HAS_MEMBERS', memberCount: mine.members } as const;
        }
        // O código vale uma vez: só quem o marcar como usado primeiro continua.
        const used = await tx.run(
          `UPDATE family_invite SET used_at = CONVERT(datetime2(3), @now, 127),
             used_by_account_id = @account
           WHERE token_hash = @hash AND used_at IS NULL`,
          { hash: str(tokenHash, 64), now: when(nowIso), account: str(accountId) },
        );
        if (used.rowsAffected === 0) return { status: 'INVALID' } as const;
        await tx.run('UPDATE member SET family_id = @target WHERE family_id = @mine', {
          target: str(target),
          mine: str(mine.familyId),
        });
        await tx.run('DELETE FROM family_membership WHERE account_id = @account', {
          account: str(accountId),
        });
        await tx.run('DELETE FROM family WHERE id = @mine', { mine: str(mine.familyId) });
        await tx.run(
          `INSERT INTO family_membership (id, family_id, account_id, role, joined_at)
           VALUES (@membership, @target, @account, 'GUARDIAN', CONVERT(datetime2(3), @now, 127))`,
          {
            membership: str(newId()),
            target: str(target),
            account: str(accountId),
            now: when(nowIso),
          },
        );
        return { status: 'JOINED', moved: mine.members } as const;
      });
    },
    async leave(accountId) {
      return db.transaction(async (tx) => {
        await ensureHousehold(tx, accountId);
        const mine = await mineOf(tx, accountId);
        if (mine.guardians === 1) return 'ALONE' as const;
        if (mine.role === 'OWNER') return 'OWNER_MUST_TRANSFER' as const;
        await tx.run('DELETE FROM family_membership WHERE account_id = @account', {
          account: str(accountId),
        });
        await startOver(tx, accountId);
        return 'LEFT' as const;
      });
    },
    async remove(ownerAccountId, guardianId) {
      return db.transaction(async (tx) => {
        await ensureHousehold(tx, ownerAccountId);
        const mine = await mineOf(tx, ownerAccountId);
        if (mine.role !== 'OWNER') return 'FORBIDDEN' as const;
        const target = await tx.run(
          `SELECT account_id FROM family_membership
           WHERE id = @guardian AND family_id = @family AND account_id <> @owner`,
          { guardian: str(guardianId), family: str(mine.familyId), owner: str(ownerAccountId) },
        );
        const targetAccount = target.rows[0] ? text(target.rows[0], 'account_id') : undefined;
        if (!targetAccount) return 'NOT_FOUND' as const;
        await tx.run('DELETE FROM family_membership WHERE account_id = @account', {
          account: str(targetAccount),
        });
        await startOver(tx, targetAccount);
        return 'REMOVED' as const;
      });
    },
    async transfer(ownerAccountId, guardianId) {
      return db.transaction(async (tx) => {
        await ensureHousehold(tx, ownerAccountId);
        const mine = await mineOf(tx, ownerAccountId);
        if (mine.role !== 'OWNER') return 'FORBIDDEN' as const;
        const target = await tx.run(
          `SELECT id FROM family_membership
           WHERE id = @guardian AND family_id = @family AND account_id <> @owner`,
          { guardian: str(guardianId), family: str(mine.familyId), owner: str(ownerAccountId) },
        );
        if (target.rows.length === 0) return 'NOT_FOUND' as const;
        await tx.run(
          `UPDATE family_membership SET role = CASE WHEN id = @guardian THEN 'OWNER' ELSE 'GUARDIAN' END
           WHERE family_id = @family AND (id = @guardian OR id = @mine)`,
          { guardian: str(guardianId), family: str(mine.familyId), mine: str(mine.id) },
        );
        return 'TRANSFERRED' as const;
      });
    },
  };

  const ping = async () => {
    await db.run('SELECT 1 AS ok');
  };

  return { members, doses, consents, accounts, reminders, households, auth, ping };
}
