import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDatabasePool, query } from "./client.js";

let schemaReady = false;

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

  await query(`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const appliedResult = await query<MigrationRow>("select id from schema_migrations");
  const applied = new Set(appliedResult.rows.map((row) => row.id));
  const { directory, files } = await readMigrationFiles();
  const migrationFiles = files
    .filter((file) => /^\d+_.+\.sql$/i.test(file))
    .sort();

  const pool = getDatabasePool();

  for (const file of migrationFiles) {
    if (applied.has(file)) {
      continue;
    }

    const sql = await readFile(path.join(directory, file), "utf8");
    const client = await pool.connect();

    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations (id) values ($1)", [file]);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  schemaReady = true;
}
