# Daily ingestion

## Operating contract

AWS EventBridge and CodeBuild are the selected production scheduler/worker.
See [AWS preparation](aws-preparation.md) for the prepared, disabled infrastructure.
The committed GitHub Actions workflows remain a disabled fallback. **Production activation remains
explicitly deferred.** The fallback GitHub schedules do not write until
`DAILY_INGESTION_ENABLED=true`; manual dispatch requires the database secret.
No hosted database, secrets, or enable flags were provisioned by this change.

The initial product is next-morning completed-game statistics. Live scores and
post-game polling remain separate future features. The morning run starts at
15:17 UTC; a second run at 21:17 UTC provides another recovery opportunity.
These are intended start times, not publication guarantees. GitHub schedules
can be delayed or dropped. See [GitHub scheduling documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

The coordinator owns data policy; Actions only invokes it. The same command
runs locally against PostgreSQL using Python and Polars. The website reads
stored data only and never fetches NHL or MoneyPuck while rendering.

## Refresh and publication order

`sportsball daily-update` performs the following work:

1. Acquire a PostgreSQL session advisory lock shared by scheduled and manual
   daily coordinators. An overlapping invocation exits without starting a run.
   The lock also proves an interrupted earlier daily coordinator is gone; its
   still-running parent and children are marked failed, retaining their audit IDs.
2. Refresh schedules from three days before through seven days after the UTC
   run date. Resolve the active season from an override or the latest stored
   regular-season/playoff game within that lookahead.
3. Enroll the active season and resume previously enrolled unfinished seasons.
   Reconcile weekly schedule pages from September through August, including
   future games. A separate `covered_through` cursor revisits the entire gap
   since the previous discovery, even if the future schedule was already loaded.
   Each page commits before advancing its cursor. Completed active-season
   sweeps restart after seven days to pick up distant schedule changes.
4. Queue recent final games for corrections, plus every missing final game
   anywhere in the enrolled season and all unfinished game tasks. Missing and
   failed games get priority. Process up to 100 games per season per invocation.
   Games omitted by the bound remain queued after the correction window passes.
5. Refresh box scores, play-by-play, and participating player profiles. Failed
   profile refreshes also remain retryable after their original game date.
   Postponed/non-final queued games wait for play without becoming health errors.
6. Refresh the current/enrolled season's NHL Stats summaries used by career,
   historical, and draft-outcome pages. This existing transactional import also
   rebuilds historical peaks and era baselines. It does not reload the entire
   all-time archive.
7. Rebuild game-derived and NHL profile-derived season totals only if the
   season's prerequisite work is complete. Previous aggregates remain when
   discovery, profiles, or game imports are incomplete.
8. Independently attempt MoneyPuck season, team-game, player-game, shot, line,
   pairing, and derived unit imports after the season has a final game. Record
   supported game coverage by regular season/playoffs separately from successful
   download timestamps.
9. Refresh official standings, attempt up to 100 missing player profiles, and
   rebuild descriptive schedule context if core ingestion has no failures.
10. Finish the parent audit. Actions runs health diagnostics even after an
    ingestion failure and optionally expires configured website caches after
    successful core publication.

The schedule discovery page bound defaults to 64 for each of the gap and
season-sweep passes (`--max-schedule-pages`). The game bound is `--max-games`.
These bounds apply per enrolled season. Historical repair dates use source
snapshots available **now**, not point-in-time historical revisions. Game
selection uses the NHL game date; audit clocks use UTC. Regular season and
playoffs retain their existing separate data contracts. Preseason games do not
enter completed-game statistical ingestion.

## Persistent state and failure behavior

- `daily_schedule_checkpoints`: next weekly page, results discovery coverage,
  and last sweep activity per season. This is separate from historical backfill
  checkpoints and does not imply historical backfill certification.
- `daily_work`: dataset/source key, season, status, attempt count, latest parent
  run, check/publication timestamps, retry time, error, and coverage counts.
- `ingestion_runs.parent_run_id`: explicit parent/child provenance. Existing
  standalone imports retain a null parent.

Short transient retries stay in the existing throttled clients. Failed daily
work receives a persisted two-hour cooldown. Interrupted work is retried after
another coordinator obtains the lock. Failed work never expires merely because
it is old. Cooling-down failures do not crowd out other eligible games.

The parent is `succeeded` when all requested work is complete, `degraded` when
core NHL publication succeeds but advanced data is pending/failed, or `failed`
when core work is incomplete. Actual import failures still exit unsuccessfully,
including advanced-only failures. Expected missing advanced game coverage is
reported as a warning, with an error after its documented grace period.

Transactions remain scoped to a game or source dataset. This is not a global
atomic snapshot: readers can see new game facts before rebuilt season totals.
Incomplete derived totals are not deliberately published; the previous complete
aggregate remains while prerequisite work retries. `published_at` on a season
job describes that dataset, not a guarantee that all providers agree.

MoneyPuck coverage checks count game/dataset presence, not every individual
player or shot. They exclude unsupported playoff player/line datasets. Exact
row-level validation remains in the source importers and historical audit.
MoneyPuck's files can lag NHL results; a successful unchanged download cannot
clear a missing-game coverage warning.

## Local operation and recovery

Apply the release's migrations separately, then run:

```bash
uv run --project pipeline --frozen sportsball verify-database-schema
uv run --project pipeline --frozen sportsball daily-update
uv run --project pipeline --frozen sportsball check-data-health
```

A bounded NHL-only recovery:

```bash
uv run --project pipeline --frozen sportsball daily-update \
  --run-date 2026-01-15 --season-id 20252026 \
  --correction-days 5 --max-games 100 --skip-moneypuck
```

An unsuccessful bounded invocation can mean unfinished work remains, rather
than lost progress. Run again after the retry time. After fixing malformed
source/schema data, wait for the cooldown or the next scheduled invocation.
Never reset checkpoints or delete facts to make health green. Older completed
game corrections outside the normal window remain explicit repair operations.
Draft selections remain a separate seasonal import (`ingest-draft-history`).

The first run after migration enrolls the resolved season. This is not a full
archive bootstrap. Existing historical backfill commands still prepare earlier
seasons; explicitly select a missed older season if it was never enrolled.

## GitHub Actions and future activation

- `.github/workflows/daily-ingestion.yml`: 15:17 and 21:17 UTC, manual overrides,
  90-minute timeout, non-overlapping workflow runs, outcome/health summary.
- `.github/workflows/ingestion-health.yml`: independent read-only checks at
  00:47 and 18:47 UTC, plus manual dispatch. A dropped ingestion invocation can
  therefore be detected without the failed job reaching its own health step.
- Both schedules are gated by `DAILY_INGESTION_ENABLED`. Health warnings are
  visible but only health errors fail the monitor. GitHub workflow failures use
  the operator's GitHub notification settings; no external messaging is configured.
- Both check the deployed Alembic revision. **Daily jobs do not apply migrations.**
  Releases must apply migrations before the new ingestion version runs.

For the selected AWS deployment, follow [the AWS activation gates](aws-preparation.md).
The checklist below applies only if the GitHub Actions fallback is deliberately selected:

1. Select and restore-test a hosted PostgreSQL database. Use separate website
   read credentials and ingestion write credentials. Do not expose the laptop DB.
2. Apply all release migrations and verify schema/backup recovery. Use a fresh
   logical backup before migration and test the selected hosting recovery process.
3. Configure the Actions `SPORTSBALL_DATABASE_URL` secret.
4. After website deployment, optionally configure the Actions
   `SPORTSBALL_WEB_URL` variable and `SPORTSBALL_REVALIDATION_TOKEN` secret;
   configure the same token in the website. The authenticated
   `POST /api/ingestion/revalidate` expires all shared statistics caches.
   Without this integration, existing timed caches refresh on subsequent reads;
   reference/history data can remain cached longer than active-game reads.
   Multiple website instances require a shared cache/invalidation mechanism.
5. Rehearse a manual run, inspect `/api/health` and Actions health output,
   verify actual rendered data, and measure a busy night and late-season archive.
6. Verify failure notifications, backup restoration, and an external uptime
   monitor. The independent Actions health job still shares GitHub's failure
   domain and cannot detect a complete GitHub outage on its own.
7. Enable scheduled ingestion only after explicit activation authorization.

## Capacity and retained data

NHL requests remain incremental; MoneyPuck still downloads source archives and
replaces changed/current season tables using the existing importers. Identical
raw artifacts are deduplicated by checksum; each genuinely revised archive is
retained. There is no automatic source-archive deletion policy. Migration 0028 adds an
opt-in version-pinned S3 backend for new file artifacts; PostgreSQL remains the
local default and existing bytes are not moved. See [AWS preparation](aws-preparation.md).
There is also no new unchanged-normalization shortcut: preserving correction
and repair behavior takes priority until measurements justify that optimization.

Before hosting selection, measure database/artifact growth, download bytes,
peak memory, per-source duration, and complete-run time against the 90-minute
workflow limit. Synthetic recovery tests do not establish real-season capacity
or upstream publication deadlines. Storage sizing and live load measurements
remain deployment prerequisites, not evidence supplied by unit tests.

## Source-change runbook

1. Inspect the Actions summary and the parent/child audited failure.
2. Identify source unavailability, schema change, missing identity, or DB error.
3. Preserve existing facts and retained source artifacts; repair the adapter
   with a small recorded fixture and run the relevant isolated database tests.
4. Release the fix, apply any required migrations outside daily automation,
   then rerun the bounded command after its cooldown.
5. Check game coverage, season totals, website caches, and operational health.

The ingestion connection must be direct PostgreSQL or use session pooling;
transaction pooling cannot provide the coordinator's session lock. Do not run
standalone mutating backfills concurrently with the daily coordinator: those
commands retain their separate historical workflows. Automatic interrupted-run
recovery only reconciles parents marked with this coordination version; legacy
running audits still use the existing conservative reconciliation command.
