import "server-only";

import { Pool, type QueryResultRow } from "pg";

const globalDatabase = globalThis as typeof globalThis & {
  sportsballPool?: Pool;
};

function databaseUrl(): string {
  const value = process.env.SPORTSBALL_WEB_DATABASE_URL;
  if (!value) {
    throw new Error(
      "SPORTSBALL_WEB_DATABASE_URL is required for server-side database reads",
    );
  }
  return value;
}

function getPool(): Pool {
  if (!globalDatabase.sportsballPool) {
    globalDatabase.sportsballPool = new Pool({
      connectionString: databaseUrl(),
      application_name: "sportsball-web",
      max: 10,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    });
  }
  return globalDatabase.sportsballPool;
}

export async function query<Row extends QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
): Promise<Row[]> {
  const result = await getPool().query<Row>(text, [...values]);
  return result.rows;
}

export async function closeDatabasePool(): Promise<void> {
  if (globalDatabase.sportsballPool) {
    await globalDatabase.sportsballPool.end();
    delete globalDatabase.sportsballPool;
  }
}
