# Operational data health

Operational health answers whether current data is fresh enough to serve. It
is separate from the historical completeness audit, which verifies entire
season coverage.

## Command-line check

Run the detailed check against the configured PostgreSQL database:

```bash
uv run --project pipeline --frozen sportsball check-data-health
```

The command evaluates:

- the latest audited `daily_update` status and completion time;
- ingestion runs left in `running` state for more than two hours;
- the latest successful NHL schedule and standings imports;
- box-score completeness for final games in the last three days;
- play-by-play completeness for final games in the last three days;
- the oldest latest-success timestamp across the five current MoneyPuck jobs.

Example output:

```text
daily_ingestion          healthy last successful update 2h 4m ago
stuck_ingestion_runs     healthy no ingestion run has exceeded two hours
nhl_schedules            healthy last successful update 2h 3m ago
official_standings       healthy last successful update 1h 58m ago
recent_boxscores         healthy 8/8 recent final games complete
recent_play_by_play      healthy 8/8 recent final games complete
moneypuck                warning last successful update 52h 10m ago
summary status=warning errors=0 warnings=1
```

The default final-game window can be changed with `--recent-days`. The command
exits with code `1` when any check is an error. Warnings exit successfully
unless `--warnings-as-errors` is supplied.

## Thresholds

| Check | Healthy | Warning | Error |
| --- | --- | --- | --- |
| Daily update | at most 36 hours | over 36 through 48 hours | over 48 hours, missing, or failed |
| NHL schedule | at most 36 hours | over 36 through 48 hours | over 48 hours or missing |
| NHL standings | at most 36 hours | over 36 through 48 hours | over 48 hours or missing |
| MoneyPuck package | at most 48 hours | over 48 through 96 hours | over 96 hours |
| Missing MoneyPuck job | — | warning | — |
| Running ingestion | less than two hours | daily parent still running | any run over two hours |
| Recent final-game facts | all complete | — | one or more games incomplete |

MoneyPuck receives a wider window because its publication cadence is
independent from the NHL feeds. Missing MoneyPuck job history is initially a
warning so a newly provisioned environment can complete core NHL operation
before advanced archives are available.

An offseason with no final games in the recent window is healthy rather than
incomplete.

## HTTP readiness endpoint

`GET /api/health` is a lightweight public readiness signal. It verifies
database connectivity and evaluates the latest audited daily parent run:

- `200` and `status: "ok"` when the last daily run is at most 36 hours old;
- `200` and `status: "degraded"` between 36 and 48 hours, or while a recent
  run is still in progress;
- `503` and `status: "error"` when the run is missing, failed, stuck for over
  two hours, older than 48 hours, or the database cannot be reached.

Responses use `Cache-Control: no-store`. The endpoint does not expose database
credentials, ingestion errors, or row-level source details. Operators use the
CLI and audited `ingestion_runs` records for diagnosis.

## Automation

The daily GitHub Actions workflow invokes `check-data-health` after a
successful daily refresh. An error therefore fails the workflow and becomes
available to the alerting system added later in the production-operations
milestone.

Recommended incident order:

1. Read the failed workflow step and detailed health output.
2. Inspect the latest parent and child records in `ingestion_runs`.
3. Determine whether the failure is source availability, schema change,
   database connectivity, or incomplete game processing.
4. Preserve the last good public data while fixing the cause.
5. Run a bounded manual recovery and then rerun the health check.
