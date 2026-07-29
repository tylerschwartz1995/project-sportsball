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
