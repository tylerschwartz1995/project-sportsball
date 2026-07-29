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
teams, players, seasons, rosters, events, and statistics, while SQL is also
well suited to later feature engineering.

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

Python workers are proposed for historical backfills, daily synchronization,
normalization, and later modelling. Each import will be idempotent: rerunning
the same date or game must update the same records without creating duplicates.

The initial pipeline is:

```text
source fetch -> raw payload -> validation -> normalization -> database upsert
             -> audit record -> derived aggregates
```

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

