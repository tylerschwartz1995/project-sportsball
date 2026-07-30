# Architecture

## Goals

- Serve current and historical NHL statistics quickly.
- Keep data acquisition independent from the website.
- Preserve enough raw and normalized history for future predictive modelling.
- Make upstream sources replaceable.
- Support idempotent daily imports and safe backfills.

## Components

### Web application

A server-rendered Next.js TypeScript application provides standings, schedules,
traditional and advanced game pages, team pages, player profiles, historical
navigation, and sortable statistical comparisons. Server Components call the
internal query functions directly instead of making an HTTP round trip to the
same application. Hosting will be selected during the deployment milestone.

### Application API

Read-only application endpoints and Server Components query normalized records
through a shared, server-only TypeScript data layer. Typed contracts cover
seasons, standings, schedules, box scores, teams, players, and MoneyPuck season
and game analytics. No page or route calls an upstream NHL or MoneyPuck source
during a user request, keeping the site responsive and preventing public
traffic from multiplying provider requests.

### Database

PostgreSQL is the system of record. Its relational model fits games,
teams, players, seasons, rosters, events, and statistics. SQL will be used for
schema migrations, constraints, indexing, and straightforward data retrieval.
Business transformations and model features will not be implemented as large
SQL pipelines.

Implemented entity groups:

- seasons, franchises, teams, season-specific identities, and transitions;
- players and enriched player profiles;
- games and durable backfill checkpoints;
- team-game and player-game statistics;
- play-by-play events and event participants;
- derived and NHL-published season statistics;
- official standings snapshots;
- MoneyPuck season, game, shot, line, and pairing observations;
- ingestion runs, retained JSON payloads, and retained downloaded artifacts.

Source identifiers will be stored alongside internal identifiers. MoneyPuck
records are resolved to canonical NHL games, teams, and players during
normalization through explicit, season-aware mappings rather than fuzzy names.

### Ingestion workers

Python is the standard data-processing language for:

- NHL and MoneyPuck clients;
- historical backfills and daily synchronization;
- schema validation and normalization;
- derived hockey statistics;
- feature engineering;
- model training, evaluation, and prediction.

Each import will be idempotent: rerunning the same date or game must update the
same records without creating duplicates.

The ingestion pipeline is:

```text
source fetch -> raw payload -> validation -> normalization -> database upsert
             -> audit record -> derived aggregates
```

### Feature engineering

Feature pipelines will be ordinary versioned Python modules with unit tests.
They will read timestamped observations from PostgreSQL, calculate features
primarily with Polars and numerical libraries, and write versioned feature
records back to PostgreSQL or training artifacts to object storage. Pandas
will only be introduced at compatibility boundaries where a modelling or
visualization library requires it.

Every feature row must record:

- the entity and prediction target it belongs to;
- the point in time at which the feature was knowable;
- the observation window used;
- the feature-set name and version;
- the code or model run that produced it.

This point-in-time design is required to prevent future game results or revised
statistics from leaking into historical training examples. SQL remains a
storage and retrieval tool rather than the feature-engineering language.

### Implemented ingestion package layout

Ingestion orchestration remains separate from source clients, normalization,
persistence, and validation:

```text
pipeline/
├── pyproject.toml
├── src/sportsball/
│   ├── clients/
│   │   ├── nhl/
│   │   │   ├── client.py
│   │   │   └── schemas.py
│   │   └── moneypuck/
│   │       └── client.py
│   ├── ingestion/
│   │   ├── orchestration/
│   │   │   ├── schedules.py
│   │   │   ├── season_backfill.py
│   │   │   ├── boxscores.py
│   │   │   ├── play_by_play.py
│   │   │   ├── player_profiles.py
│   │   │   ├── standings.py
│   │   │   ├── season_stats.py
│   │   │   └── moneypuck_*.py
│   ├── normalization/
│   │   ├── games.py
│   │   ├── boxscores.py
│   │   ├── play_by_play.py
│   │   ├── standings.py
│   │   ├── season_stats.py
│   │   └── moneypuck_*.py
│   ├── persistence/
│   │   ├── database.py
│   │   ├── models.py
│   │   └── repositories/
│   ├── reference/
│   │   └── team_identities.py
│   ├── validation/
│   │   └── completeness.py
│   └── cli.py
└── tests/
    ├── fixtures/
    └── test_*.py
```

The execution path is:

```text
job -> orchestration -> source client -> raw payload storage -> validation
    -> normalization -> database transaction -> checkpoint and audit result
```

Responsibilities are intentionally narrow:

- `clients` implements provider communication, schemas, and provider errors.
- orchestration decides which source records a job needs and records resumable
  state.
- source payload and artifact repositories preserve originals, checksums, and
  provenance.
- `validation` checks cross-table completeness and source coverage.
- `normalization` maps provider records to the canonical domain model.
- `persistence` centralizes database transactions and repository operations.
- checkpoint tables make jobs observable, resumable, and safe to rerun.
- `cli.py` contains thin command-line entry points for people and schedulers.

Generic `utils` and `helpers` packages will be avoided. Shared code must have a
specific domain or infrastructure responsibility.

### Scheduling and monitoring

The `daily-update` Python coordinator owns refresh ordering and can be invoked
by any scheduler. An opt-in GitHub Actions workflow currently provides manual
dispatches and a disabled-by-default `15:00 UTC` schedule. Production
activation waits for a hosted database, secrets, backups, and recovery
validation; scheduler configuration does not contain ingestion domain logic.

Every parent and child run records its status, input range, row counts, errors,
and duration. Recent final games are deliberately re-fetched to capture NHL
corrections, while source-specific transactions preserve the last known-good
table when a replacement fails. The detailed Python health check evaluates
source freshness, stuck runs, and recent-game completeness; the web health
route exposes only database readiness and daily-parent freshness. See
[Daily ingestion](daily-ingestion.md) and
[Operational data health](data-health.md).

## Boundaries

- No upstream request occurs while rendering a user page.
- Raw NHL and MoneyPuck records remain distinguishable.
- Derived statistics store their formula and version.
- Predictive features and predictions will live in separate tables from
  observed results.
- Credentials and deployment configuration remain outside source control.

## Repository structure

The project uses one repository so application and data contracts can evolve
together:

```text
project-sportsball/
├── apps/
│   └── web/                   # TypeScript website and read-only application API
├── pipeline/
│   ├── .python-version        # Python version selected by uv
│   ├── pyproject.toml         # Python package and tool configuration
│   ├── uv.lock                # Cross-platform locked Python dependencies
│   ├── src/sportsball/
│   │   ├── clients/           # NHL and MoneyPuck source adapters
│   │   ├── ingestion/         # Fetching, raw storage, retries, and audit records
│   │   ├── normalization/     # Source records to canonical domain records
│   │   ├── persistence/       # SQLAlchemy models, sessions, and repositories
│   │   ├── reference/         # Team and franchise identity mappings
│   │   └── validation/        # Cross-table completeness checks
│   └── tests/
├── database/
│   └── migrations/            # Versioned PostgreSQL schema changes
├── docs/                      # Decisions, sources, operations, and metric definitions
├── .github/
│   └── workflows/             # Pipeline and web continuous integration
├── compose.yaml               # Local PostgreSQL service
├── Makefile                   # Quality, database, and web commands
├── README.md
└── .env.example
```

Large raw datasets, database files, trained models, caches, and secrets will
not be committed. Small deterministic source fixtures needed by tests live
under `pipeline/tests/fixtures`.

### Dependency direction

- `pipeline` owns all source-specific and analytical logic.
- Polars is the default dataframe engine throughout `pipeline`.
- `database` defines storage independently of any one data source.
- `apps/web` uses stable serializable read contracts backed by parameterized,
  server-only PostgreSQL queries.
- `apps/web` never imports Python internals or calls upstream data sources.
- Deployment infrastructure will run published jobs and services without
  containing domain logic.

`moneypuck_unit_season_stats` is a replaceable derived table built in Python
with Polars from `moneypuck_line_game_stats`. It canonicalizes each player set,
sums game-level numerators, and recomputes season shares rather than averaging
published game percentages.
