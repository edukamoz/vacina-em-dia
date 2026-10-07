import sql from 'mssql';
import type { SqlExecutor, SqlParam, SqlParams, SqlResult } from './sql-executor';

/** Configuração da conexão com o Azure SQL. */
export interface MssqlConfig {
  /** Nome completo do servidor (`xxx.database.windows.net`). */
  readonly server: string;
  readonly database: string;
}

/** Erros transitórios do Azure SQL (banco pausado, reiniciando ou sobrecarregado). */
const TRANSIENT_NUMBERS = new Set([
  4060, 10928, 10929, 40197, 40501, 40540, 40613, 49918, 49919, 49920,
]);
const TRANSIENT_CODES = new Set(['ETIMEOUT', 'ESOCKET', 'ECONNCLOSED', 'ETIMEDOUT', 'ELOGIN']);
const ATTEMPTS = 4;
const RETRY_DELAY_MS = 8000;

function isTransient(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { number, code } = error as { number?: unknown; code?: unknown };
  return (
    (typeof number === 'number' && TRANSIENT_NUMBERS.has(number)) ||
    (typeof code === 'string' && TRANSIENT_CODES.has(code))
  );
}

function toSqlType(param: SqlParam): sql.ISqlType {
  switch (param.type) {
    case 'varchar':
      return sql.VarChar(param.length ?? 256);
    case 'nvarchar':
      return sql.NVarChar(param.length ?? 256);
    case 'bit':
      return sql.Bit();
    case 'int':
      return sql.Int();
  }
}

function bind(request: sql.Request, params: SqlParams): void {
  for (const [name, param] of Object.entries(params)) {
    request.input(name, toSqlType(param), param.value);
  }
}

async function execute(request: sql.Request, text: string): Promise<SqlResult> {
  const result = await request.query(text);
  return {
    rows: (result.recordset ?? []) as SqlResult['rows'],
    rowsAffected: result.rowsAffected.reduce((sum, n) => sum + n, 0),
  };
}

/**
 * Cria o executor sobre o Azure SQL. A autenticação é **somente Microsoft Entra** (sem senha de
 * SQL): na nuvem usa a identidade gerenciada da Function App e, no computador do desenvolvedor, o
 * `az login` (cadeia `DefaultAzureCredential`). O banco gratuito pausa por inatividade, então o
 * primeiro acesso depois de uma pausa pode levar até um minuto: o tempo de conexão é longo e erros
 * transitórios são repetidos algumas vezes. O conjunto de conexões é criado sob demanda.
 *
 * @param config - Servidor e banco.
 * @param managedIdentityClientId - Opcional: identidade gerenciada atribuída pelo usuário.
 */
export function createMssqlExecutor(
  config: MssqlConfig,
  managedIdentityClientId?: string,
): SqlExecutor & { close(): Promise<void> } {
  let pool: Promise<sql.ConnectionPool> | undefined;

  const connect = (): Promise<sql.ConnectionPool> => {
    pool ??= new sql.ConnectionPool({
      server: config.server,
      database: config.database,
      authentication: {
        type: 'azure-active-directory-default',
        options: managedIdentityClientId ? { clientId: managedIdentityClientId } : {},
      },
      options: { encrypt: true, trustServerCertificate: false },
      connectionTimeout: 60_000,
      requestTimeout: 30_000,
      pool: { max: 5, min: 0, idleTimeoutMillis: 30_000 },
    })
      .connect()
      .catch((error: unknown) => {
        pool = undefined;
        throw error;
      });
    return pool;
  };

  async function withRetry<T>(work: () => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await work();
      } catch (error) {
        if (attempt >= ATTEMPTS || !isTransient(error)) throw error;
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  const executor: SqlExecutor & { close(): Promise<void> } = {
    run: (text, params = {}) =>
      withRetry(async () => {
        const request = (await connect()).request();
        bind(request, params);
        return execute(request, text);
      }),
    async transaction(work) {
      return withRetry(async () => {
        const transaction = new sql.Transaction(await connect());
        await transaction.begin();
        try {
          const tx: SqlExecutor = {
            run: async (text, params = {}) => {
              const request = new sql.Request(transaction);
              bind(request, params);
              return execute(request, text);
            },
            transaction: (inner) => inner(tx),
          };
          const value = await work(tx);
          await transaction.commit();
          return value;
        } catch (error) {
          await transaction.rollback().catch(() => undefined);
          throw error;
        }
      });
    },
    async close() {
      const current = await pool?.catch(() => undefined);
      await current?.close();
      pool = undefined;
    },
  };
  return executor;
}
