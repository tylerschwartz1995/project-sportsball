# Implementation roadmap

## Milestone 1: foundation

- Create the monorepo package layout.
- Select the web framework and Python dataframe/tooling stack.
- Add local PostgreSQL development configuration.
- Define migrations for seasons, teams, players, and games.
- Add formatting, linting, tests, and continuous integration.

## Milestone 2: NHL historical ingestion

- Implement a rate-limited NHL client.
- Import seasons, teams, schedules, and completed games.
- Import box scores and play-by-play from 2005–06 onward.
- Add raw-payload storage, validation, retries, and import audit records.
- Verify counts against representative seasons.

## Milestone 3: core website

- Add league dashboard and season selector.
- Add standings and schedules.
- Add team and player pages.
- Add results and box-score pages.
- Add search, sorting, pagination, and mobile layouts.

## Milestone 4: advanced analytics

- Implement approved MoneyPuck download ingestion.
- Map MoneyPuck players, teams, seasons, and games to NHL records.
- Add metric definitions, source attribution, and coverage labels.
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
