import { config } from "../../../src/config.js";
import { query } from "../../../src/server/infrastructure/database/client.js";
import { __test as databaseClientTest } from "../../../src/server/infrastructure/database/client.js";
import { ensureSchema, __test as schemaTest } from "../../../src/server/infrastructure/database/schema.js";

export const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
export const testDatabaseSkipReason = "Set TEST_DATABASE_URL to run database integration tests.";

export async function setupTestDatabase(): Promise<void> {
  if (!hasTestDatabase) {
    return;
  }

  await databaseClientTest.closePool();
  schemaTest.resetSchemaState();
  config.database.url = process.env.TEST_DATABASE_URL;
  await ensureSchema();
  await cleanTestDatabase();
}

export async function cleanTestDatabase(): Promise<void> {
  if (!hasTestDatabase) {
    return;
  }

  const result = await query<{ table_name: string }>(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
        and table_name <> 'schema_migrations'
      order by table_name
    `,
  );
  const tableNames = result.rows.map((row) => `"${row.table_name}"`);

  if (tableNames.length > 0) {
    await query(`truncate table ${tableNames.join(", ")} restart identity cascade`);
  }
}

export async function teardownTestDatabase(): Promise<void> {
  await databaseClientTest.closePool();
  schemaTest.resetSchemaState();
}
