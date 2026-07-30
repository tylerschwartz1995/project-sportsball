# Implementation roadmap

Status values reflect the repository after the operational data-health checks
were implemented on July 30, 2026.

## Milestone 1: foundation — complete

- Create the monorepo package layout.
- Use Next.js with TypeScript for the web application.
- Use uv for Python environments and dependency locking, and Polars for dataframe processing.
- Add local PostgreSQL development configuration.
- Define migrations for seasons, teams, players, and games.
- Add formatting, linting, tests, and continuous integration.

## Milestone 2: historical ingestion — complete

- Implement a rate-limited NHL client.
- Import seasons, teams, schedules, and completed games.
- Import box scores and play-by-play from 2005–06 onward.
- Add raw-payload storage, validation, retries, and import audit records.
- Import player profiles, official standings, NHL-published player season
  splits, and Polars-derived season statistics.
- Import approved MoneyPuck season, team-game, player-game, shot, line, and
  pairing downloads across their published coverage ranges.
- Verify all 21 seasons with the read-only completeness audit.

## Milestone 3: core website — complete

- [x] Add the server-only PostgreSQL query foundation and response contracts.
- [x] Add the league dashboard, historical season selector, and standings.
- [x] Add schedules and results.
- [x] Add team and player pages.
- [x] Add game and box-score pages.
- [x] Add search, sorting, pagination, and complete mobile layouts.

## Milestone 4: advanced analytics — complete

- [x] Expose MoneyPuck team, skater, and goalie season summaries through
  read-only application queries.
- [x] Add initial metric definitions, MoneyPuck attribution, and coverage
  labels.
- [x] Add advanced team, skater, and goalie season views.
- [x] Expose game, shot, line, and pairing records through application queries.
- [x] Add advanced game views, shot maps, lines, and pairings.
- [x] Add Polars-derived season forward-line and defensive-pairing rankings.

## Milestone 5: daily operation

- [x] Add an audited daily coordinator for bounded incremental imports and
  recent-game corrections.
- [x] Add a disabled-by-default scheduled workflow and manual operational
  dispatch.
- [x] Add source freshness, stuck-run, recent-game completeness, and HTTP
  readiness checks.
- [x] Add safe abandoned-run reconciliation and complete a verified local
  logical backup/restore rehearsal.
- Activate the schedule after the hosted database, secrets, and recovery
  process are ready.
- Select a hosted PostgreSQL plan with sufficient storage and recovery.
- Configure provider-managed backups, alerts, and a data-quality dashboard.
- Deploy the application and database.
- Complete the production recovery and source-change runbooks.

## Milestone 6: predictive modelling

- Define prediction targets without leaking future information.
- Build point-in-time Python feature pipelines.
- Create versioned training datasets and time-based evaluations.
- Establish simple baseline models.
- Add team, game, and player models only after baseline validation.
- Track prediction timestamps, model versions, and realized outcomes.
