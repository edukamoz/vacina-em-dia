import type { DoseStatus, Relationship } from '@vacina/shared';
import type {
  AccountRepository,
  AuthRepository,
  ConsentRepository,
  DoseRepository,
  MemberRepository,
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
  readonly auth: AuthRepository;
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

/** Instante ISO 8601 (UTC) como parâmetro; o banco converte para DATETIME2 com o estilo 127. */
const when = (value: string) => str(value, 30);

const MEMBER_COLUMNS = `id, display_name, CONVERT(char(10), birth_date, 23) AS birth_date, is_pregnant, relationship`;

/** Parentesco guardado; `null` quando não informado. O banco só aceita os códigos conhecidos. */
function relationshipOf(row: SqlRow): Relationship | null {
  const value = row['relationship'];
  return typeof value === 'string' ? (value as Relationship) : null;
}

function toMember(row: SqlRow): StoredMember {
  return {
    id: text(row, 'id'),
    name: text(row, 'display_name'),
    birthDate: text(row, 'birth_date'),
    isPregnant: flag(row, 'is_pregnant'),
    relationship: relationshipOf(row),
  };
}

const DOSE_COLUMNS = `d.id, d.member_id, d.rule_id, d.custom_vaccine, d.custom_dose_label, d.status,
  CONVERT(char(10), d.due_date, 23) AS due_date,
  CONVERT(char(10), d.scheduled_date, 23) AS scheduled_date,
  CONVERT(char(10), d.applied_date, 23) AS applied_date`;

function toDose(row: SqlRow): StoredDose {
  const status = text(row, 'status');
  if (!DOSE_STATUSES.includes(status)) throw new Error('Estado de dose inesperado.');
  const ruleId = nullableText(row, 'rule_id');
  const customVaccine = nullableText(row, 'custom_vaccine');
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
 * Cria os repositórios sobre o Azure SQL. O dono é sempre uma conta (`account_id`): um membro só é
 * alcançado com o `account_id` do dono, e uma dose só é alcançada pelo membro do dono, então um
 * usuário nunca lê nem grava dado de outro (CLAUDE.md §10).
 *
 * @param db - Executor de consultas (a porta; em produção, o `mssql`).
 */
export function createSqlRepositories(db: SqlExecutor): SqlRepositories {
  const members: MemberRepository = {
    async list(ownerId) {
      const result = await db.run(
        `SELECT ${MEMBER_COLUMNS} FROM member WHERE account_id = @owner ORDER BY seq`,
        { owner: str(ownerId) },
      );
      return result.rows.map(toMember);
    },
    async get(ownerId, id) {
      const result = await db.run(
        `SELECT ${MEMBER_COLUMNS} FROM member WHERE account_id = @owner AND id = @id`,
        { owner: str(ownerId), id: str(id) },
      );
      const row = result.rows[0];
      return row ? toMember(row) : undefined;
    },
    async save(ownerId, member) {
      await db.run(
        `UPDATE member SET display_name = @name, birth_date = CONVERT(date, @birth, 23),
           is_pregnant = @pregnant, relationship = @relationship
         WHERE id = @id AND account_id = @owner;
         IF @@ROWCOUNT = 0
           INSERT INTO member (id, account_id, display_name, birth_date, is_pregnant, relationship)
           VALUES (@id, @owner, @name, CONVERT(date, @birth, 23), @pregnant, @relationship);`,
        {
          id: str(member.id),
          owner: str(ownerId),
          name: nstr(member.name, 80),
          birth: str(member.birthDate, 10),
          pregnant: { type: 'bit', value: member.isPregnant },
          relationship: { type: 'varchar', value: member.relationship, length: 20 },
        },
      );
    },
    async remove(ownerId, id) {
      await db.run('DELETE FROM member WHERE id = @id AND account_id = @owner', {
        id: str(id),
        owner: str(ownerId),
      });
    },
  };

  const doses: DoseRepository = {
    async listByMember(ownerId, memberId) {
      const result = await db.run(
        `SELECT ${DOSE_COLUMNS} FROM dose d JOIN member m ON m.id = d.member_id
         WHERE m.account_id = @owner AND d.member_id = @member ORDER BY d.seq`,
        { owner: str(ownerId), member: str(memberId) },
      );
      return result.rows.map(toDose);
    },
    async get(ownerId, id) {
      const result = await db.run(
        `SELECT ${DOSE_COLUMNS} FROM dose d JOIN member m ON m.id = d.member_id
         WHERE m.account_id = @owner AND d.id = @id`,
        { owner: str(ownerId), id: str(id) },
      );
      const row = result.rows[0];
      return row ? toDose(row) : undefined;
    },
    async saveMany(ownerId, list) {
      await db.transaction(async (tx) => {
        for (const dose of list) {
          await tx.run(
            `UPDATE d SET status = @status, due_date = CONVERT(date, @due, 23),
               scheduled_date = CONVERT(date, @scheduled, 23), applied_date = CONVERT(date, @applied, 23)
             FROM dose d JOIN member m ON m.id = d.member_id
             WHERE d.id = @id AND m.account_id = @owner;
             IF @@ROWCOUNT = 0
               INSERT INTO dose (id, member_id, rule_id, custom_vaccine, custom_dose_label, status,
                 due_date, scheduled_date, applied_date)
               SELECT @id, m.id, @rule, @customVaccine, @customDoseLabel, @status, CONVERT(date, @due, 23),
                 CONVERT(date, @scheduled, 23), CONVERT(date, @applied, 23)
               FROM member m WHERE m.id = @member AND m.account_id = @owner;`,
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
        await tx.run('DELETE FROM member WHERE account_id = @owner', { owner: str(ownerId) });
        await tx.run('DELETE FROM consent WHERE account_id = @owner', { owner: str(ownerId) });
      });
    },
  };

  const accountColumns = `id, email, password_hash, CONVERT(char(23), created_at, 127) AS created_at`;
  const auth: AuthRepository = {
    async createAccount(account) {
      try {
        await db.run(
          `INSERT INTO app_account (id, email, password_hash, created_at)
           VALUES (@id, @email, @hash, CONVERT(datetime2(3), @at, 127))`,
          {
            id: str(account.id),
            email: nstr(account.email, 254),
            hash: str(account.passwordHash, 200),
            at: when(account.createdAt),
          },
        );
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

  return { members, doses, consents, accounts, auth };
}
