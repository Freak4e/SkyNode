import pg from "pg";
import { requireDatabaseUrl } from "../../../config.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getDatabasePool(): pg.Pool {
  if (!pool) {
    const connectionString = requireDatabaseUrl();
    pool = new Pool({
      connectionString,
      ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : false,
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

function shouldUseSsl(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    return url.hostname !== "localhost" && url.hostname !== "127.0.0.1";
  } catch {
    return true;
  }
}

export const __test = {
  async closePool(): Promise<void> {
    if (pool) {
      await pool.end();
      pool = null;
    }
  },
  shouldUseSsl,
};
