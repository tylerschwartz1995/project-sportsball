import "server-only";

import { createHash } from "node:crypto";
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
  const startedAt = performance.now();
  try {
    const result = await getPool().query<Row>(text, [...values]);
    reportQueryDuration(text, performance.now() - startedAt, result.rowCount);
    return result.rows;
  } catch (error) {
    reportQueryDuration(text, performance.now() - startedAt, null, true);
    throw error;
  }
}

function reportQueryDuration(
  text: string,
  durationMs: number,
  rowCount: number | null,
  failed = false,
): void {
  const threshold = slowQueryThreshold();
  if (!failed && durationMs < threshold) return;

  console.warn(
    JSON.stringify({
      event: failed ? "database-query-error" : "slow-database-query",
      durationMs: Math.round(durationMs * 10) / 10,
      rowCount,
      operation: text.trimStart().match(/^[A-Za-z]+/)?.[0]?.toUpperCase() ?? "QUERY",
      fingerprint: createHash("sha256")
        .update(text.replace(/\s+/g, " ").trim())
        .digest("hex")
        .slice(0, 12),
    }),
  );
}

function slowQueryThreshold(): number {
  const configured = Number(process.env.SPORTSBALL_SLOW_QUERY_MS ?? 250);
  return Number.isFinite(configured) && configured >= 0 ? configured : 250;
}

export async function closeDatabasePool(): Promise<void> {
  if (globalDatabase.sportsballPool) {
    await globalDatabase.sportsballPool.end();
    delete globalDatabase.sportsballPool;
  }
}
