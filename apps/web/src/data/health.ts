import "server-only";

import { query } from "@/data/database";

const HEALTHY_AGE_MS = 36 * 60 * 60 * 1_000;
const ERROR_AGE_MS = 48 * 60 * 60 * 1_000;
const STUCK_AGE_MS = 2 * 60 * 60 * 1_000;

export type ServiceHealthStatus = "ok" | "degraded" | "error";

type DailyRunRow = {
  status: string;
  started_at: Date;
  finished_at: Date | null;
};

export type DailyIngestionHealth = {
  status: ServiceHealthStatus;
  runStatus: string | null;
  lastCompletedAt: string | null;
  message: string;
};

export type ServiceHealth = {
  service: "sportsball-web";
  status: ServiceHealthStatus;
  database: "ok";
  checkedAt: string;
  dailyIngestion: DailyIngestionHealth;
};

export async function getServiceHealth(
  now: Date = new Date(),
): Promise<ServiceHealth> {
  const rows = await query<DailyRunRow>(`
    SELECT status, started_at, finished_at
    FROM ingestion_runs
    WHERE job_name = 'daily_update'
    ORDER BY started_at DESC
    LIMIT 1
  `);
  const dailyIngestion = evaluateDailyIngestion(rows[0] ?? null, now);
  return {
    service: "sportsball-web",
    status: dailyIngestion.status,
    database: "ok",
    checkedAt: now.toISOString(),
    dailyIngestion,
  };
}

export function evaluateDailyIngestion(
  run: DailyRunRow | null,
  now: Date,
): DailyIngestionHealth {
  if (!run) {
    return {
      status: "error",
      runStatus: null,
      lastCompletedAt: null,
      message: "No audited daily update has completed.",
    };
  }

  if (run.status === "running") {
    const age = Math.max(0, now.getTime() - run.started_at.getTime());
    return {
      status: age > STUCK_AGE_MS ? "error" : "degraded",
      runStatus: run.status,
      lastCompletedAt: null,
      message:
        age > STUCK_AGE_MS
          ? "The latest daily update has been running for more than two hours."
          : "The latest daily update is still running.",
    };
  }

  if (run.status !== "succeeded" || !run.finished_at) {
    return {
      status: "error",
      runStatus: run.status,
      lastCompletedAt: run.finished_at?.toISOString() ?? null,
      message: `The latest daily update status is ${run.status}.`,
    };
  }

  const age = Math.max(0, now.getTime() - run.finished_at.getTime());
  if (age <= HEALTHY_AGE_MS) {
    return {
      status: "ok",
      runStatus: run.status,
      lastCompletedAt: run.finished_at.toISOString(),
      message: "The latest daily update completed within 36 hours.",
    };
  }
  if (age <= ERROR_AGE_MS) {
    return {
      status: "degraded",
      runStatus: run.status,
      lastCompletedAt: run.finished_at.toISOString(),
      message: "The latest daily update is older than 36 hours.",
    };
  }
  return {
    status: "error",
    runStatus: run.status,
    lastCompletedAt: run.finished_at.toISOString(),
    message: "The latest daily update is older than 48 hours.",
  };
}
