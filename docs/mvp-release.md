# Local MVP release record

## Document status

This record preserves the original July 31, 2026 MVP sign-off and its evidence.
Last reviewed on September 6, 2026, the current application has continued to
improve on `main`; the post-release section below records material changes
delivered after the `v0.1.0-mvp` tag.

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
  default scheduled workflow and a manually runnable daily coordinator.

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

## Post-release progress

The following product improvements were delivered after the `v0.1.0-mvp` tag
and are part of the current local application:

- The draft archive now contains every official NHL selection from 1963
  through 2026, including players who never appeared in the NHL, historical
  team identities, traded-pick ownership, and true appearance-rate
  denominators.
- Team pages now include completed and remaining schedule-strength analysis,
  venue, rest, back-to-back, estimated travel, and supporting-game context.
- The line-combination workspace now supports league and team scope, rolling
  windows, minimum-ice-time filtering, and drill-down to supporting games.
- Game pages now include interactive game-flow views, the playoff workspace
  includes expanded series analysis, and team pages include a
  results-versus-process comparison.
- History, schedule, draft, comparison, and analytical controls received
  broader URL-backed state, clearer filters, and substantial desktop and
  responsive-layout refinements.
- Page caching, query pagination, lazy-loaded visualizations, reduced game
  payloads, performance telemetry, and regression coverage improved runtime
  performance and maintainability.
- Modern Stats Exploration replaced the original sidebar/palette with Manrope,
  graphite/green themes, horizontal desktop navigation, and a grouped mobile Menu.
- Content, filter, and usability follow-ups added complete historical career
  totals, all-season player search, context-preserving return links, clearer
  staged forms, shot filters, and reduced default content.
- Draft Class Rankings and historical peaks, progression, decade leaders, and
  era-relative skater/goalie indexes are available as descriptive research tools.

These additions expand the MVP without changing its release boundary: the
application remains a local product until hosting and scheduled production
operation are deliberately activated.

## Known limitations and deferred work

- The site is local only. Hosting, production secrets, managed backups, alerts,
  and scheduler activation remain Milestone 6 work.
- The September 5 audit recorded no completed daily update and stale source
  freshness. Disabling the scheduler does not itself prevent manual updates;
  rerun the health command to determine current readiness before deployment.
- MoneyPuck coverage is source-limited and does not provide every historical or
  playoff table available from official NHL data.
- Contracts, salary cap, transactions, injuries, historical query exploration,
  named saved-comparison collections, and broader era/opportunity adjustment
  remain in the product backlog. Descriptive era-relative scoring and goalie
  Save Index views are already implemented. Analytical and comparison views
  preserve applicable state in the URL, but there is no user account or server-side saved library.
- Multiple sports and predictive models are explicitly post-MVP stages.

## Next stage

The `v0.1.0-mvp` tag remains the reproducible original sign-off point. Current
work should begin from the latest `main`, which includes the post-release
improvements above. The next release boundary remains hosted operation:
deployment, scheduled writes, managed recovery, and production monitoring.
