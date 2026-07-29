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

Foundation scaffolding is in progress. The repository contains a Python
pipeline, PostgreSQL migrations, local Docker infrastructure, and a Next.js
web application.

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

Run the Python checks:

```bash
make pipeline-check
```

Install and start the website:

```bash
npm install --prefix apps/web
npm run dev --prefix apps/web
```

The website runs at `http://localhost:3000` and its initial health endpoint is
`http://localhost:3000/api/health`.

## Planning

- [Data sources and coverage](docs/data-sources.md)
- [Initial architecture](docs/architecture.md)
- [Implementation roadmap](docs/roadmap.md)
