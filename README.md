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

- Conda
- Docker Desktop with Docker Compose
- Node.js and npm

Create the Python environment and install the pipeline:

```bash
conda env create --file environment.yml
conda run --name sportsball python -m pip install -e "pipeline[dev]"
```

Start PostgreSQL and apply migrations:

```bash
docker compose up --detach postgres
conda run --name sportsball python -m alembic \
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
