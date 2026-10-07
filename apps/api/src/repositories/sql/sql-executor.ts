/** Tipos de parâmetro aceitos nas consultas (os que o esquema usa). */
export type SqlParam =
  | { readonly type: 'varchar'; readonly value: string | null; readonly length?: number }
  | { readonly type: 'nvarchar'; readonly value: string | null; readonly length?: number }
  | { readonly type: 'bit'; readonly value: boolean }
  | { readonly type: 'int'; readonly value: number };

/** Parâmetros nomeados de uma consulta (`@nome` no texto SQL). */
export type SqlParams = Readonly<Record<string, SqlParam>>;

/** Linha devolvida pelo banco. */
export type SqlRow = Readonly<Record<string, unknown>>;

/** Resultado de uma consulta. */
export interface SqlResult {
  readonly rows: readonly SqlRow[];
  readonly rowsAffected: number;
}

/**
 * Porta mínima de acesso ao Azure SQL. Os repositórios dependem só dela; a implementação real usa o
 * pacote `mssql` (ver `mssql-executor.ts`). Toda consulta é parametrizada: o texto SQL nunca recebe
 * valores concatenados (CLAUDE.md §10).
 */
export interface SqlExecutor {
  /** Executa um lote de T-SQL com parâmetros. */
  run(text: string, params?: SqlParams): Promise<SqlResult>;
  /** Executa várias consultas na mesma transação; desfaz tudo se a função lançar um erro. */
  transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T>;
}

/** Códigos de erro do SQL Server para violação de chave primária ou única. */
const DUPLICATE_KEY_NUMBERS = new Set([2601, 2627]);

/**
 * Diz se o erro é de chave duplicada (por exemplo, e-mail já cadastrado).
 *
 * @param error - Erro lançado pelo executor.
 */
export function isDuplicateKeyError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { number } = error as { number?: unknown };
  return typeof number === 'number' && DUPLICATE_KEY_NUMBERS.has(number);
}

/** Lê uma coluna de texto; lança erro se o banco devolver outro tipo (defesa contra esquema errado). */
export function text(row: SqlRow, column: string): string {
  const value = row[column];
  if (typeof value !== 'string') throw new Error(`Coluna ${column} inesperada.`);
  return value;
}

/** Lê uma coluna de texto que aceita nulo. */
export function nullableText(row: SqlRow, column: string): string | null {
  const value = row[column];
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new Error(`Coluna ${column} inesperada.`);
  return value;
}

/** Lê uma coluna booleana (BIT). */
export function flag(row: SqlRow, column: string): boolean {
  const value = row[column];
  if (typeof value !== 'boolean') throw new Error(`Coluna ${column} inesperada.`);
  return value;
}

/**
 * Converte um instante devolvido por `CONVERT(..., 127)` (DATETIME2 em UTC) em texto ISO 8601 com
 * `Z` e três casas de milissegundo. O SQL Server omite a fração quando ela é zero e completa a
 * coluna com espaços.
 *
 * @param value - Texto do banco, por exemplo `2026-10-07T12:00:00` ou `2026-10-07T12:00:00.12`.
 */
export function isoUtc(value: string): string {
  const [base = '', fraction = ''] = value.trim().split('.');
  return `${base}.${fraction.padEnd(3, '0').slice(0, 3)}Z`;
}

/** Lê uma coluna de instante (DATETIME2 em UTC) como texto ISO 8601 com `Z`. */
export function instant(row: SqlRow, column: string): string {
  return isoUtc(text(row, column));
}
