# Sportsball

> **Current visual system:** [Modern Stats Exploration](docs/design-system.md),
> with a light-default reference theme, dark-mode support, and readable statistical tables.

A personal NHL statistics website with all-time traditional season records from
1917–18 onward and detailed game and advanced data across their supported eras.

## Project scope

The app focuses on Games, Standings, Teams, and Players, in that navigation order.
Games is the landing page. Team and
player pages offer Basic Stats and Advanced Stats, with season and phase
selection. Completed-game pages retain box scores, scoring, and game analytics.
The daily ingestion and historical data foundation remain in place.

The broader research interface has been scaled back. See
[App simplification](docs/app-simplification.md) for the current scope.
Predictive modelling and additional research workflows are deferred.

## Status

**Local MVP complete as of July 31, 2026.** The website, ingestion pipeline,
historical archive, advanced analytics, local database workflow, tests, and
operational checks are implemented. The private website is deployed, and daily
production ingestion was enabled on September 30, 2026. Predictive modelling
remains deferred. See the
[MVP release record](docs/mvp-release.md) for the shipped scope, verification,
and known limitations.

The completed local backfill covers the initial NHL and MoneyPuck scope.
The recorded local database contains official skater, goalie, and team season
summaries from 1917–18 through 2025–26. It also contains all 21 detailed seasons from 2005–06
through 2025–26, including
schedules, results, box scores, play-by-play, player profiles, traditional
season statistics, standings, and the published MoneyPuck datasets described
in [Data sources and coverage](docs/data-sources.md).
The September 5, 2026 completeness audit passed all 21 detailed seasons with
no errors. These are recorded audit results, not a live health guarantee or data
installed by cloning the repository. Coverage limitations are documented in
[Data sources](docs/data-sources.md).

Daily production ingestion remains active. This interface simplification does
not change data collection, stored history, deployment, or operational schedules.

## Local development

Prerequisites:

- [uv](https://docs.astral.sh/uv/getting-started/installation/) 0.12.x;
  the pipeline requires Python 3.13 (managed by uv)
- Docker Desktop with Docker Compose for PostgreSQL 18
- Node.js 24 and npm, matching CI

Run commands from the repository root. Defaults work with the local Compose
database; `.env.example` lists configuration names. For custom values, create a
root `.env` for Compose/Python and an ignored `apps/web/.env.local` for the
Node-compatible `SPORTSBALL_WEB_DATABASE_URL`. Next.js does not load the root
`.env` automatically.

Create the project-local Python environment and install the locked dependencies:

```bash
make env
```

uv creates the environment at `pipeline/.venv`. To change dependencies, use
`uv add --project pipeline <package>` for runtime packages or
`uv add --project pipeline --dev <package>` for development tools, then commit
both `pipeline/pyproject.toml` and `pipeline/uv.lock`.

Start PostgreSQL and apply migrations:

```bash
docker compose up --detach postgres
uv run --project pipeline --frozen alembic \
  --config database/alembic.ini upgrade head
```

Migrations create the schema, not the historical archive. The commands below
are individual ingestion examples, not a complete website bootstrap. See the
[documentation index](docs/README.md) for the ordered ingestion guides and
coverage checks. No source refresh happens when the website starts.

Ingest an NHL schedule request anchored to a historical date:

```bash
uv run --project pipeline --frozen sportsball ingest-schedule 2005-10-05
```

The job retains the source payload and checksum, records an audited ingestion
run, and idempotently upserts seasons, teams, and games.

Run or resume a complete regular-season and playoff schedule backfill:

```bash
uv run --project pipeline --frozen sportsball backfill-season 20052006
```

Use `--max-requests N` to process a bounded number of weekly pages. Progress is
checkpointed after every committed page, so running the command again resumes
from the next unfinished date.

Backfill and reconcile an inclusive range of seasons:

```bash
uv run --project pipeline --frozen sportsball \
  backfill-seasons 20052006 20252026
```

Completed seasons are reconciled and skipped without making another NHL
request. Failures are reported per season without discarding progress made by
the remaining range. Use `--max-seasons N` for a bounded invocation.

Ingest official all-time traditional season summaries idempotently:

```bash
uv run --project pipeline --frozen sportsball \
  ingest-historical-seasons 19171918 20252026
```

This paginates NHL Stats reports, retains audited source payloads, and preserves
era-specific unavailable values as `NULL` rather than zero.

Ingest traditional team, skater, and goalie statistics for a completed game:

```bash
uv run --project pipeline --frozen sportsball \
  ingest-game-boxscore 2005020001
```

The game must already exist in the schedule index. The original box score is
retained, and canonical player and game-stat records are updated idempotently.

Audit the complete historical database without changing it:

```bash
uv run --project pipeline --frozen sportsball \
  audit-data-completeness 20052006 20252026
```

The command exits unsuccessfully when a required dataset is incomplete. See
[Data-completeness audit](docs/data-completeness-audit.md) for its checks,
source-specific coverage rules, and warning behavior.

Refresh recent schedules, final games, standings, season aggregates, and
current MoneyPuck snapshots:

```bash
uv run --project pipeline --frozen sportsball daily-update
```

The command is safe to rerun and deliberately refreshes recent final games to
capture source corrections. See [Daily ingestion](docs/daily-ingestion.md) for
its boundaries, overrides, failure behavior, and scheduler activation.

Check current-source freshness and recent final-game completeness:

```bash
uv run --project pipeline --frozen sportsball check-data-health
```

The command exits unsuccessfully for stale core data, failed or stuck
ingestion, and missing recent box scores or play-by-play. The web readiness
endpoint at `http://localhost:3000/api/health` exposes a smaller database and
daily-run status suitable for deployment monitoring.

Create and verify a portable local PostgreSQL backup:

```bash
make db-backup
make db-verify-backup BACKUP_PATH=backups/sportsball-YYYYMMDDTHHMMSSZ.dump
```

The restore verification uses an isolated scratch database and never
overwrites the development database. See
[Database backup and recovery](docs/database-recovery.md).

Run the Python checks:

```bash
make pipeline-check
```

Install and start the website:

```bash
npm ci --prefix apps/web
SPORTSBALL_WEB_DATABASE_URL=postgresql://sportsball:sportsball@localhost:5432/sportsball \
  npm run dev --prefix apps/web
```

The website runs at `http://localhost:3000`. `/api/health` checks database access
and audited daily-run freshness, so a new or stale local database can return
503 even while historical pages work. See [Operational data health](docs/data-health.md).

After migrating an existing archive or completing standalone schedule, box-score,
or MoneyPuck team-game backfills, run `make analytics-build` to refresh descriptive
historical and schedule tables. The daily coordinator refreshes schedule context;
historical summary ingestion refreshes historical calculations automatically.

Run `make web-check` for web lint, types, unit tests, and the production build.
Database and browser checks require additional setup described in the
[web README](apps/web/README.md).

## Documentation

The [complete documentation index](docs/README.md) separates current guides,
operational procedures, and historical audit/decision records.

- [Agent working agreement](AGENTS.md)
- [Data sources and coverage](docs/data-sources.md)
- [Architecture](docs/architecture.md)
- [Repository structure and reproducible test fixtures](docs/repository-structure.md)
- [Implementation roadmap](docs/roadmap.md)
- [Local MVP release record](docs/mvp-release.md)
- [September 2026 application audit](docs/application-audit-2026-09-05.md)
- [Visual design system](docs/design-system.md)
- [Visual direction exploration](docs/design-exploration.md)
- [Web query layer](docs/web-query-layer.md)
- [Data-completeness audit](docs/data-completeness-audit.md)
- [Historical box-score backfill](docs/boxscore-backfill.md)
- [Player statistics data dictionary](docs/player-statistics.md)
- [Season-statistics definitions and refresh behavior](docs/season-statistics.md)
- [All-time historical season statistics](docs/historical-statistics.md)
- [Complete NHL draft history](docs/draft-history.md)
- [Play-by-play ingestion and event definitions](docs/play-by-play.md)
- [Player profile ingestion](docs/player-profiles.md)
- [Team identity and franchise history](docs/team-identities.md)
- [Official NHL standings snapshots](docs/official-standings.md)
- [Official player season statistics](docs/official-player-season-stats.md)
- [MoneyPuck ingestion](docs/moneypuck-season-ingestion.md)
- [Advanced analytics presentation](docs/advanced-analytics.md)
- [Daily ingestion](docs/daily-ingestion.md)
- [Operational data health](docs/data-health.md)
- [Database backup and recovery](docs/database-recovery.md)
- [Product ideas](docs/product-ideas.md)

The [content audit and implementation decisions](docs/content-audit-implementation.md) document the application’s essential-content policy and coverage corrections.

## Hosted deployment preparation

The selected personal-site setup is Neon PostgreSQL, Vercel Hobby, GitHub Actions
for ingestion/backups, and private S3 files. Connection guards, two-user private
access through managed Neon Auth email codes, hosted workflows, and storage-only
Terraform are implemented. Passkeys are deferred. The website is deployed at
[Sportsball](https://sportsball-iota.vercel.app), using the restored Neon database.
Daily ingestion has been active since September 30, 2026; scheduled monthly
backups remain disabled. See [hosted preparation](docs/hosted-preparation.md).
The earlier unapplied AWS server scaffolding has been removed;
[active AWS storage](docs/aws-preparation.md) remains supported.
