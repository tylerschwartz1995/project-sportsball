import "server-only";

import { readContext } from "./read-context";
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
      statement_timeout: queryTimeout(),
    });
    // Idle connections can fail outside a query's promise (for example on restart).
    globalDatabase.sportsballPool.on("error", () => {
      console.warn(JSON.stringify({ event: "database-pool-error" }));
    });
  }
  return globalDatabase.sportsballPool;
}

export async function query<Row extends QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
): Promise<Row[]> {
  const startedAt = performance.now();
  let client;
  let poolWaitMs = 0;
  try {
    client = await getPool().connect();
    poolWaitMs = performance.now() - startedAt;
    const result = await client.query<Row>(text, [...values]);
    reportQueryDuration(text, performance.now() - startedAt, result.rowCount, false, poolWaitMs);
    return result.rows;
  } catch (error) {
    reportQueryDuration(text, performance.now() - startedAt, null, true,
      client ? poolWaitMs : performance.now() - startedAt);
    throw error;
  } finally {
    client?.release();
  }
}

function queryTimeout(): number {
  const value = Number(process.env.SPORTSBALL_QUERY_TIMEOUT_MS ?? 10_000);
  return Number.isFinite(value) && value >= 100 && value <= 60_000 ? value : 10_000;
}

function reportQueryDuration(
  text: string,
  durationMs: number,
  rowCount: number | null,
  failed = false,
  poolWaitMs = 0,
): void {
  const threshold = slowQueryThreshold();
  if (!failed && durationMs < threshold && process.env.SPORTSBALL_READ_TELEMETRY !== "1") return;

  console.warn(
    JSON.stringify({
      event: failed ? "database-query-error" : durationMs >= threshold ? "slow-database-query" : "database-query",
      durationMs: Math.round(durationMs * 10) / 10,
      rowCount,
      poolWaitMs: Math.round(poolWaitMs * 10) / 10,
      executionMs: Math.round((durationMs - poolWaitMs) * 10) / 10,
      route: readContext()?.route,
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
