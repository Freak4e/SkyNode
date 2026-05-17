import pg from "pg";
import { requireDatabaseUrl } from "../../../config.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getDatabasePool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: requireDatabaseUrl(),
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }

  return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  return getDatabasePool().query<T>(text, values);
}
