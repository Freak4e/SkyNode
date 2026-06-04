import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDatabasePool } from "./client.js";

let schemaReady = false;
let schemaPromise: Promise<void> | null = null;

type MigrationRow = {
  id: string;
};

const migrationsDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");
const sourceMigrationsDirectory = path.join(process.cwd(), "src", "server", "infrastructure", "database", "migrations");

async function readMigrationFiles() {
  try {
    return {
      directory: migrationsDirectory,
      files: await readdir(migrationsDirectory),
    };
  } catch {
    return {
      directory: sourceMigrationsDirectory,
      files: await readdir(sourceMigrationsDirectory),
    };
  }
}

export async function ensureSchema(): Promise<void> {
  if (schemaReady) {
    return;
  }

  if (!schemaPromise) {
    schemaPromise = runEnsureSchema().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  await schemaPromise;
}

async function runEnsureSchema(): Promise<void> {
  const { directory, files } = await readMigrationFiles();
  const migrationFiles = files
    .filter((file) => /^\d+_.+\.sql$/i.test(file))
    .sort();
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    await client.query("select pg_advisory_lock(hashtext('skynode_schema_migrations'))");

    await client.query(`
      create table if not exists schema_migrations (
        id text primary key,
        applied_at timestamptz not null default now()
      );
    `);

    const appliedResult = await client.query<MigrationRow>("select id from schema_migrations");
    const applied = new Set(appliedResult.rows.map((row) => row.id));

    for (const file of migrationFiles) {
      if (applied.has(file)) {
        continue;
      }

      const sql = await readFile(path.join(directory, file), "utf8");
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations (id) values ($1)", [file]);
      await client.query("commit");
      applied.add(file);
    }

    schemaReady = true;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // Ignore rollback errors when no transaction is active.
    }
    throw error;
  } finally {
    await client.query("select pg_advisory_unlock(hashtext('skynode_schema_migrations'))").catch(() => undefined);
    client.release();
  }
}

export const __test = {
  resetSchemaState(): void {
    schemaReady = false;
    schemaPromise = null;
  },
};
