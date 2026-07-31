# Local MVP release record

## Release decision

Sportsball's NHL website is complete as a local MVP as of July 31, 2026. The
release is represented by the local annotated Git tag `v0.1.0-mvp`. This is a
product and engineering checkpoint, not a public deployment.

## Included product scope

- A redesigned NHL overview with results, upcoming games, standings, scoring
  leaders, and direct archive navigation.
- Overall, conference, and division standings with cumulative-points trends.
- Complete stored schedules, upcoming games, results, box scores, official
  scoring summaries, and readable play-by-play timelines.
- Team and player directories, profiles, sortable season tables, game logs,
  filters, and rolling performance plots.
- Traditional and MoneyPuck team, skater, goalie, game, shot, line, and pairing
  analytics wherever the source coverage supports them.
- Interactive shot maps, league comparison plots, and direct player comparison.
- Postseason brackets and leaders, draft-outcome analysis, and historical
  career and single-season records.
- Persistent dark-default/light themes, responsive navigation, consistent
  system states, keyboard skip navigation, visible focus, and reduced-motion
  support.
- Idempotent Python ingestion, retained source artifacts, PostgreSQL storage,
  completeness auditing, local backup/restore tooling, CI, and a disabled-by-
  default daily coordinator.

## Data coverage

- Official traditional skater, goalie, and team season summaries: 1917–18
  through 2025–26.
- Detailed NHL schedules, results, box scores, and play-by-play: 2005–06 through
  2025–26.
- Published future schedule: all 1,344 stored 2026–27 regular-season games.
- MoneyPuck datasets: their published coverage boundaries, generally beginning
  in 2008–09 for the complete advanced package. Coverage notes remain visible
  in the interface rather than treating unavailable history as zero.

## Sign-off evidence

The following checks were completed against the July 31 local database:

- `make pipeline-check`: Ruff and Pyright passed; 66 Python tests passed and 25
  database-dependent tests were skipped locally. The complete database suite
  continues to run in pull-request CI against an isolated PostgreSQL service.
- `make web-check`: lint, TypeScript, 120 unit tests, and the production build
  passed.
- Web database suite: all 123 tests passed when enabled against local
  PostgreSQL.
- Completeness audit: all 21 seasons from 2005–06 through 2025–26 passed with
  zero errors. Three seasons retain 41 total warnings for source player
  references that cannot be mapped to canonical NHL players.
- Representative overview, directory, filtered, detail, analytics, and 404
  routes returned their expected HTTP status without a rendered application or
  server error.

## Known limitations and deferred work

- The site is local only. Hosting, production secrets, managed backups, alerts,
  and scheduler activation remain Milestone 6 work.
- The operational health command reports that no audited daily update has
  completed. This is expected while scheduled writes remain disabled; source
  freshness and ingestion readiness should be revalidated when deployment work
  begins.
- MoneyPuck coverage is source-limited and does not provide every historical or
  playoff table available from official NHL data.
- The initial draft page covers drafted players represented in stored NHL
  history, not every player who was selected and never reached the league.
- Contracts, salary cap, transactions, injuries, complete draft history,
  historical query exploration, saved comparisons, and era-adjusted records
  remain in the product backlog.
- Multiple sports and predictive models are explicitly post-MVP stages.

## Next stage

This task ends with the local MVP. Subsequent work should begin from the MVP
tag and focus on the user's planned refactors and product refinements before
any hosting decision or predictive-modelling implementation.
