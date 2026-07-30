# Sportsball

A personal NHL statistics website covering current and historical data from the
2005–06 season onward.

## Project scope

The first stage will provide:

- Daily NHL data updates
- Team and player statistics
- Standings, schedules, and game results
- Game box scores
- Historical season navigation
- Advanced analytics

The second stage will add predictive modelling for team and player performance.

## Status

Historical ingestion is complete for the initial NHL and MoneyPuck scope.
PostgreSQL contains all 21 seasons from 2005–06 through 2025–26, including
schedules, results, box scores, play-by-play, player profiles, traditional
season statistics, standings, and the published MoneyPuck datasets described
in [Data sources and coverage](docs/data-sources.md).

The full completeness audit currently passes every season with no errors.
Three early seasons contain warnings for a total of 41 play-by-play participant
references that the NHL source identifies but that cannot be mapped to a
canonical player. Those source identifiers remain preserved. The core website
is implemented with read-only standings, schedules, box scores, team pages,
player profiles, historical navigation, directory search and sorting,
responsive layouts, sortable statistics tables, and JSON endpoints.
MoneyPuck presentation is implemented on team, player, and game pages,
including game-level expected-goal and possession tables, shot maps, forward
lines, and defensive pairings. Shot-map events can be selected to inspect
shooter, result, timing, goalie, and shot-quality context, and a shared metric
guide explains advanced-stat definitions across the website. Season-level
top-line and defensive-pairing
rankings are calculated in Polars and available across the league and on team
pages. Completed game pages include official scoring summaries and expandable
period-by-period timelines from the normalized NHL play-by-play archive. Team
and player profiles also link to complete selected-season game logs with
last-ten form summaries and available MoneyPuck game metrics. An audited
daily-update coordinator and opt-in GitHub Actions scheduler are implemented;
scheduled writes remain disabled until the deployment milestone provides a
hosted database, secrets, and tested recovery. Operational health checks now
cover source freshness, stuck jobs, recent-game completeness, and HTTP
deployment readiness. The selected Data Workspace interface provides
responsive global navigation, persistent light/dark themes, and native
workspace presentations for the league overview and standings.

## Local development

Prerequisites:

- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- Docker Desktop with Docker Compose
- Node.js and npm

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
npm install --prefix apps/web
SPORTSBALL_WEB_DATABASE_URL=postgresql://sportsball:sportsball@localhost:5432/sportsball \
  npm run dev --prefix apps/web
```

The website runs at `http://localhost:3000` and its initial health endpoint is
`http://localhost:3000/api/health`.

## Documentation

- [Data sources and coverage](docs/data-sources.md)
- [Architecture](docs/architecture.md)
- [Implementation roadmap](docs/roadmap.md)
- [Visual design system](docs/design-system.md)
- [Visual direction exploration](docs/design-exploration.md)
- [Web query layer](docs/web-query-layer.md)
- [Data-completeness audit](docs/data-completeness-audit.md)
- [Historical box-score backfill](docs/boxscore-backfill.md)
- [Player statistics data dictionary](docs/player-statistics.md)
- [Season-statistics definitions and refresh behavior](docs/season-statistics.md)
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
