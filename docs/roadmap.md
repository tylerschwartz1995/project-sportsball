# Implementation roadmap

Status values reflect the repository after the historical completeness audit
on July 29, 2026.

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

## Milestone 3: core website — in progress

- [x] Add the server-only PostgreSQL query foundation and response contracts.
- [x] Add the league dashboard, historical season selector, and standings.
- [ ] Add schedules and results.
- [ ] Add team and player pages.
- [ ] Add game and box-score pages.
- [ ] Add search, sorting, pagination, and complete mobile layouts.

## Milestone 4: advanced analytics — ingestion complete, presentation pending

- Expose the stored MoneyPuck team, player, goalie, game, shot, line, and
  pairing records through read-only application queries.
- Add metric definitions, MoneyPuck attribution, and coverage labels.
- Add advanced team, player, goalie, and game views.

## Milestone 5: daily operation

- Schedule daily incremental imports and recent-game corrections.
- Add health checks, alerts, backups, and data-quality dashboards.
- Deploy the application and database.
- Document recovery and source-change procedures.

## Milestone 6: predictive modelling

- Define prediction targets without leaking future information.
- Build point-in-time Python feature pipelines.
- Create versioned training datasets and time-based evaluations.
- Establish simple baseline models.
- Add team, game, and player models only after baseline validation.
- Track prediction timestamps, model versions, and realized outcomes.
