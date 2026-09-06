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
  datasets?: DatasetFreshness[];
  run_date?: string | null;
};

export type DatasetFreshness = {
  dataset: string;
  status: string;
  checkedAt: string | null;
  publishedAt: string | null;
  coverage: Record<string, number | string | null>;
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
  datasets: DatasetFreshness[];
};

export async function getServiceHealth(
  now: Date = new Date(),
): Promise<ServiceHealth> {
  const rows = await query<DailyRunRow>(`
    SELECT r.status, r.started_at, r.finished_at, r.parameters->>'run_date' AS run_date,
      (SELECT COALESCE(json_agg(json_build_object(
        'dataset', w.dataset, 'status', w.status,
        'checkedAt', w.checked_at, 'publishedAt', w.published_at,
        'coverage', w.coverage
      ) ORDER BY w.dataset), '[]'::json)
      FROM daily_work w
      WHERE w.season_id::text = r.parameters->>'resolved_season_id'
        AND w.source_key = w.season_id::text) AS datasets
    FROM ingestion_runs r
    WHERE r.job_name = 'daily_update'
    ORDER BY r.started_at DESC
    LIMIT 1
  `);
  const dailyIngestion = evaluateDailyIngestion(rows[0] ?? null, now);
  return {
    service: "sportsball-web",
    status: dailyIngestion.status,
    database: "ok",
    checkedAt: now.toISOString(),
    dailyIngestion,
    datasets: rows[0]?.datasets ?? [],
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

  if (run.run_date && Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      - new Date(`${run.run_date}T00:00:00Z`).getTime()) / 86_400_000) > 2) {
    return {
      status: "error", runStatus: run.status,
      lastCompletedAt: run.finished_at?.toISOString() ?? null,
      message: "The latest update targets an old game date; a current refresh is overdue.",
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

  if (!["succeeded", "degraded"].includes(run.status) || !run.finished_at) {
    return {
      status: "error",
      runStatus: run.status,
      lastCompletedAt: run.finished_at?.toISOString() ?? null,
      message: `The latest daily update status is ${run.status}.`,
    };
  }

  const age = Math.max(0, now.getTime() - run.finished_at.getTime());
  if (run.status === "degraded" && age <= ERROR_AGE_MS) {
    return {
      status: "degraded",
      runStatus: run.status,
      lastCompletedAt: run.finished_at.toISOString(),
      message: "Official data updated; advanced statistics are delayed or need attention.",
    };
  }
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
