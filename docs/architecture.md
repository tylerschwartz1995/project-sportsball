# Initial architecture

## Goals

- Serve current and historical NHL statistics quickly.
- Keep data acquisition independent from the website.
- Preserve enough raw and normalized history for future predictive modelling.
- Make upstream sources replaceable.
- Support idempotent daily imports and safe backfills.

## Proposed components

### Web application

A server-rendered TypeScript application will provide league, team, player,
standings, schedule, and game pages. The exact framework and hosting provider
will be selected during scaffolding.

### Application API

Read-only application endpoints will query normalized records rather than
calling upstream sources during user requests. This keeps the site responsive
and prevents traffic from multiplying NHL or MoneyPuck requests.

### Database

PostgreSQL is the proposed system of record. Its relational model fits games,
teams, players, seasons, rosters, events, and statistics. SQL will be used for
schema migrations, constraints, indexing, and straightforward data retrieval.
Business transformations and model features will not be implemented as large
SQL pipelines.

Initial entity groups:

- seasons, franchises, teams, and venues;
- players, player names, and roster assignments;
- games, periods, officials, and game states;
- team-game and player-game statistics;
- play-by-play events and event participants;
- standings snapshots;
- advanced-stat observations;
- ingestion runs, source payloads, and validation errors.

Source identifiers will be stored alongside internal identifiers. MoneyPuck
records must be joined to NHL entities through explicit mapping tables rather
than names alone.

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

The initial pipeline is:

```text
source fetch -> raw payload -> validation -> normalization -> database upsert
             -> audit record -> derived aggregates
```

### Feature engineering

Feature pipelines will be ordinary versioned Python modules with unit tests.
They will read timestamped observations from PostgreSQL, calculate features
with Python dataframe and numerical libraries, and write versioned feature
records back to PostgreSQL or training artifacts to object storage.

Every feature row must record:

- the entity and prediction target it belongs to;
- the point in time at which the feature was knowable;
- the observation window used;
- the feature-set name and version;
- the code or model run that produced it.

This point-in-time design is required to prevent future game results or revised
statistics from leaking into historical training examples. SQL remains a
storage and retrieval tool rather than the feature-engineering language.

### Scheduling and monitoring

Daily jobs will be scheduled by the eventual hosting platform. Every run will
record its status, input range, row counts, errors, and duration. A failed job
must preserve the last known-good public data.

## Boundaries

- No upstream request occurs while rendering a user page.
- Raw NHL and MoneyPuck records remain distinguishable.
- Derived statistics store their formula and version.
- Predictive features and predictions will live in separate tables from
  observed results.
- Credentials and deployment configuration remain outside source control.

## Repository structure

The project will use one repository so application and data contracts can
evolve together:

```text
project-sportsball/
├── apps/
│   └── web/                   # TypeScript website and read-only application API
├── pipeline/
│   ├── pyproject.toml         # Python package and tool configuration
│   ├── src/sportsball/
│   │   ├── clients/           # NHL and MoneyPuck source adapters
│   │   ├── ingestion/         # Fetching, raw storage, retries, and audit records
│   │   ├── normalization/     # Source records to canonical domain records
│   │   ├── statistics/        # Reproducible derived hockey statistics
│   │   ├── features/          # Point-in-time model feature definitions
│   │   ├── models/            # Training, evaluation, and prediction
│   │   └── jobs/              # Backfill and scheduled-job entry points
│   └── tests/
├── database/
│   ├── migrations/            # Versioned PostgreSQL schema changes
│   └── seeds/                 # Small stable reference records
├── contracts/                 # Shared API and data-contract definitions
├── data/
│   └── samples/               # Small, non-sensitive test fixtures only
├── docs/                      # Decisions, sources, operations, and metric definitions
├── infrastructure/            # Deployment and scheduled-job configuration
├── .github/
│   └── workflows/             # Continuous integration and scheduled workflows
├── README.md
└── .env.example
```

Large raw datasets, database files, trained models, caches, and secrets will
not be committed. The `data/samples` directory is only for small deterministic
fixtures needed by tests.

### Dependency direction

- `pipeline` owns all source-specific and analytical logic.
- `database` defines storage independently of any one data source.
- `contracts` defines the stable shapes consumed by `apps/web`.
- `apps/web` never imports Python internals or calls upstream data sources.
- `infrastructure` runs published jobs and services without containing domain
  logic.
