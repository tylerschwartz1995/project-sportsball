# Daily ingestion

The daily update is a bounded, idempotent refresh of current NHL and MoneyPuck
data. It is implemented as a Python coordinator so the same operation can run
locally, in GitHub Actions, or on a future hosting platform without moving
domain logic into scheduler configuration.

## Refresh order

`sportsball daily-update` performs these steps:

1. Refresh schedule pages covering three days before through seven days after
   the run date.
2. Resolve the active season from an explicit override or the most recent
   stored game in that window.
3. Re-fetch box scores and play-by-play for final games from the last three
   days. Complete games are deliberately refreshed so late NHL corrections
   replace their previous values.
4. Refresh the profiles and NHL-published season splits of players who
   appeared in those games, then fill any newly discovered profiles still
   missing from earlier work.
5. Store the official standings snapshot for the run date.
6. Rebuild traditional and NHL-published player season aggregates.
7. Replace the active season's MoneyPuck season, team-game, player-game, shot,
   line, pairing, and derived season-unit data.

Every source import and derived-table replacement uses its existing
transaction. The parent `daily_update` ingestion run records the boundaries,
total reported rows, completion status, and combined error message. If one
independent game or source fails, the coordinator attempts the remaining
independent work and exits unsuccessfully after recording all failures. The
last committed version of a failed table remains available to the website.

MoneyPuck publishes datasets on its own cadence. A temporary upstream failure
will make the run fail visibly while preserving the last good MoneyPuck
tables. Operators can use `--skip-moneypuck` to isolate an NHL-only recovery
run. The coordinator does not request a new season's MoneyPuck archives until
at least one regular-season or playoff game is final, avoiding expected
preseason archive failures.

## Local operation

Start PostgreSQL and apply migrations before running the coordinator:

```bash
docker compose up --detach postgres
uv run --project pipeline --frozen alembic \
  --config database/alembic.ini upgrade head
uv run --project pipeline --frozen sportsball daily-update
```

Useful bounded overrides include:

```bash
uv run --project pipeline --frozen sportsball daily-update \
  --run-date 2026-01-15 \
  --season-id 20252026 \
  --correction-days 5 \
  --skip-moneypuck
```

The season override is useful for an offseason recovery or source
investigation. Without it, the coordinator selects the season belonging to the
most recent stored game no later than the end of the schedule lookahead
window. This keeps the completed season active during summer and switches
automatically once the next season's schedule enters the refreshed window.

## GitHub Actions scheduler

`.github/workflows/daily-ingestion.yml` runs at `15:00 UTC` and supports manual
dispatches with date, season, and MoneyPuck overrides. Scheduled writes are
intentionally disabled until production infrastructure exists.

Activation requires:

1. A hosted PostgreSQL database reachable from the selected runner.
2. A repository Actions secret named `SPORTSBALL_DATABASE_URL` containing the
   SQLAlchemy `postgresql+psycopg://...` connection URL.
3. Tested backup and recovery procedures for that database.
4. A repository Actions variable named `DAILY_INGESTION_ENABLED` set to
   `true`.

Manual dispatches are allowed before the enable variable is set, but they
still require the database secret. The workflow applies committed Alembic
migrations before invoking the daily command and prevents concurrent daily
runs from overlapping.

Do not point the workflow at a laptop database. GitHub-hosted runners cannot
depend on a personal computer remaining online, and exposing a local database
to the public internet would add avoidable security and reliability risks.

## Still required for production operation

- hosted database selection and deployment;
- automated backups with a tested restore;
- freshness and row-count health checks;
- failure notifications;
- a data-quality dashboard;
- documented source-change and recovery playbooks.
