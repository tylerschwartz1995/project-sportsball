# Implementation roadmap

Status values reflect the repository at local MVP sign-off on July 31, 2026.

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
- [x] Add official all-time traditional season summaries from 1917–18 onward.
- [x] Store the complete published 2026–27 schedule, including future games.

## Milestone 3: core website — complete

- [x] Add the server-only PostgreSQL query foundation and response contracts.
- [x] Add a league overview dashboard, dedicated standings route, and
  historical season selector.
- [x] Add schedules and results.
- [x] Add a responsive, sortable team comparison directory plus team and player
  detail pages.
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

## Milestone 5: product experience — complete for local MVP

- [x] Make standings leaders, standings rows, and schedule teams link to their
  supporting profiles.
- [x] Restrict team profile season navigation to seasons in which the team
  participated.
- [x] Separate the league dashboard, standings, and team-directory
  responsibilities.
- [x] Add league-wide advanced team, skater, and goalie leaderboards.
- [x] Add team and player game logs plus recent-form trend views.
- [x] Present normalized play-by-play as a game timeline and scoring summary.
- [x] Consolidate advanced metric discovery and definitions.
- [x] Establish the production visual design system and team-profile reference
  implementation.
- [x] Add a three-direction visual design lab with light/dark and controlled
  team-color previews.
- [x] Select Data Workspace and implement the persistent production theme
  toggle plus responsive global navigation.
- [x] Apply Data Workspace natively to the league overview and standings.
- [x] Apply Data Workspace hierarchy, controls, and readable typography to team
  and player directories and primary profiles.
- [x] Apply Data Workspace to the games directory, score presentation, scoring
  timeline, player box scores, and game-level advanced analytics.
- [x] Apply Data Workspace to advanced team, skater, and goalie leaderboards
  and the centralized metric guide.
- [x] Add consistent regular-season and playoff controls wherever the
  underlying data supports both phases.
- [x] Add an upcoming-schedule section to team profiles.
- [x] Apply the production visual design system across the remaining routes,
  including shared loading, empty, error, and not-found states.
- [x] Establish shared plot conventions and add rolling team performance
  trends.
- [x] Add rolling skater-production and goalie-performance trends.
- [x] Add the first league team results-versus-process scatterplot.
- [x] Add skater and goalie comparison and distribution views.
- [x] Add selectable metrics and direct comparisons to league team and player
  comparison plots.
- [x] Add player-directory minimum-stat and birth-region filters, and remove
  unnecessary team-directory search.
- [x] Add overall, conference, and division standings views with a filterable
  cumulative-points chart.
- [x] Add a postseason bracket and playoff scoring-leader page, with
  standings-based projected matchups before the playoffs begin.
- [x] Separate regular-season and playoff history on player profiles and make
  rolling player plots single-metric views with official and advanced options.
- [x] Increase table and plot typography for comfortable reading at 100% zoom.
- [x] Add a dedicated official-and-advanced player comparison workflow.
- [x] Reorganize player-directory filters into search, performance, and
  dependent birthplace groups.
- [x] Add the first draft-outcomes and team drafting-production workspace for
  NHL players represented in stored history.
- [x] Add an initial historical records workspace with career and single-season
  skater, goalie, and team leaderboards.

Saved comparison collections and additional shareable plot state remain
post-MVP enhancements rather than release requirements.

## Milestone 6: daily operation — local foundation complete; deployment deferred

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

## Milestone 7: predictive modelling

- Define prediction targets without leaking future information.
- Build point-in-time Python feature pipelines.
- Create versioned training datasets and time-based evaluations.
- Establish simple baseline models.
- Add team, game, and player models only after baseline validation.
- Track prediction timestamps, model versions, and realized outcomes.
