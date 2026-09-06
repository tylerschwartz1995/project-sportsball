# Implementation roadmap

Status reviewed against `main` on September 6, 2026. Milestones 1–5 retain the
July 31 local MVP checkpoint and include subsequent shipped improvements. The
[MVP release record](mvp-release.md) separates original sign-off evidence from
post-release work.

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
- [x] Add a conference-and-division team directory plus team and player detail
  pages.
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
- [x] Expand drafts to every official 1963–2026 selection with traded-pick
  identity and true NHL appearance and 100-game denominators.
- [x] Add an initial historical records workspace with career and single-season
  skater, goalie, and team leaderboards.
- [x] Replace long stacks of unrelated detail-page sections with URL-backed
  single-view tabs, including nested game-analytics views.
- [x] Match desktop component and column widths to information density with
  shared compact, standard, and wide layouts, balanced peer panels, denser
  long tables, aligned home sections, compact filters and summaries, stable
  entity/stat columns, and an ultrawide-screen ceiling.

Post-MVP improvements now shipped:

- [x] Adopt Modern Stats Exploration with Manrope, graphite/green themes,
  horizontal desktop navigation, and a grouped mobile Menu.
- [x] Add time-aware schedule difficulty, rest, and estimated travel context.
- [x] Add rolling 10/20/40-team-game combination rankings and full-season
  supporting-game drill-downs.
- [x] Add Game Flow, expanded playoff series analysis, and draft class rankings.
- [x] Add the curated historical record book, three/five-season peaks, decade
  leaders, and era-relative skater and goalie indexes.
- [x] Preserve chart selections and comparison state in shareable URLs.
- [x] Add page caching, bounded queries, deferred charts, and performance telemetry.
- [x] Separate shared UI and feature presentation, decompose Drafts, consolidate
  theme tokens, and split Python models/commands while preserving interfaces.
- [x] Add migrated synthetic database and browser smoke checks to web CI.
- [x] Complete the application, sizing, theme, content, filter, and usability
  audit fixes, including all-season player discovery and complete career totals.

Named saved-comparison collections remain backlog. See
[Product ideas](product-ideas.md) for implemented boundaries and future extensions.

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

- [x] Add conservative point-in-time observation selection and versioned dataset
  manifests, with tests for revised results and late historical backfills.
  Target-specific extraction, feature construction, and modelling remain below.

- Define prediction targets without leaking future information.
- Build point-in-time Python feature pipelines.
- Create versioned training datasets and time-based evaluations.
- Establish simple baseline models.
- Add team, game, and player models only after baseline validation.
- Track prediction timestamps, model versions, and realized outcomes.
