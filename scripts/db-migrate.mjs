// Aplica as migrações SQL de apps/api/db/migrations no Azure SQL e, opcionalmente, concede acesso
// à identidade gerenciada da API. Autentica só com Microsoft Entra (az login), sem senha de SQL.
//
// Uso:
//   node scripts/db-migrate.mjs --server <xxx.database.windows.net> --database <banco>
//   node scripts/db-migrate.mjs ... --grant-name <nome-da-function-app> --grant-client-id <guid>
//
// Quem roda precisa ser o administrador Microsoft Entra do servidor e ter o IP liberado no firewall.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sql from 'mssql';

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((arg, i, all) => (arg.startsWith('--') ? [arg.slice(2), all[i + 1]] : null))
    .filter(Boolean),
);
const { server, database } = args;
if (!server || !database) {
  console.error('Informe --server e --database.');
  process.exit(2);
}

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'api', 'db', 'migrations');
const pool = await new sql.ConnectionPool({
  server,
  database,
  authentication: { type: 'azure-active-directory-default', options: {} },
  options: { encrypt: true },
  connectionTimeout: 120_000,
  requestTimeout: 60_000,
}).connect();

try {
  await pool.request().query(`IF OBJECT_ID('schema_migration') IS NULL
    CREATE TABLE schema_migration (name VARCHAR(100) NOT NULL PRIMARY KEY, applied_at DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME())`);
  const applied = new Set(
    (await pool.request().query('SELECT name FROM schema_migration')).recordset.map((r) => r.name),
  );
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    if (applied.has(file)) {
      console.log(`já aplicada: ${file}`);
      continue;
    }
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await new sql.Request(transaction).batch(readFileSync(join(dir, file), 'utf8'));
      await new sql.Request(transaction)
        .input('name', sql.VarChar(100), file)
        .query('INSERT INTO schema_migration (name) VALUES (@name)');
      await transaction.commit();
      console.log(`aplicada: ${file}`);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  const { 'grant-name': name, 'grant-client-id': clientId } = args;
  if (name && clientId) {
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(name)) throw new Error('Nome de usuário inválido.');
    await pool
      .request()
      .input('name', sql.NVarChar(128), name)
      .input('client', sql.VarChar(36), clientId).query(`
        IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = @name)
        BEGIN
          DECLARE @sid VARBINARY(16) = CAST(CAST(@client AS UNIQUEIDENTIFIER) AS VARBINARY(16));
          DECLARE @cmd NVARCHAR(400) = N'CREATE USER ' + QUOTENAME(@name) + N' WITH SID = '
            + CONVERT(VARCHAR(100), @sid, 1) + N', TYPE = E';
          EXEC (@cmd);
        END
        DECLARE @r NVARCHAR(300) = N'ALTER ROLE db_datareader ADD MEMBER ' + QUOTENAME(@name)
          + N'; ALTER ROLE db_datawriter ADD MEMBER ' + QUOTENAME(@name);
        EXEC (@r);`);
    console.log(`acesso concedido (leitura e escrita) a ${name}`);
  }
} finally {
  await pool.close();
}
