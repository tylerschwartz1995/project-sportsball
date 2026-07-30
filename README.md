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
canonical player. Those source identifiers remain preserved. Core website
development is in progress: the first read-only query layer, league dashboard,
season selector, standings table, and JSON endpoints are implemented.

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
- [Product ideas](docs/product-ideas.md)
