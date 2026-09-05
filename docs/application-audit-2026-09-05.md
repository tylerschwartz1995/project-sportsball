# Application audit — September 5, 2026

This audit covered the local Next.js application, shared interactions, API and
query boundaries, dependency advisories, Python pipeline, migrations, historical
completeness, operational health, CI, and recovery/scheduling configuration.
It is a broad local audit, not a guarantee that every possible input, browser,
upstream response, or production infrastructure condition has been exercised.

## Fixed findings

| Finding | Result |
| --- | --- |
| Chart controls retained local selections after URL/history changes; passing Next.js internal history state also bypassed router synchronization. | Shared controls derive their selection from the URL and use the supported native history integration. Back, forward, and reload are covered by a browser regression. |
| Blocked local storage threw uncaught errors when toggling themes. | Theme changes work for the current document even when persistence is unavailable. |
| Schedule filter minimum widths clipped the date input inside its panel at constrained desktop sizes. | Four columns fit the desktop canvas; container queries switch to two or one column when the panel is narrower. Browser checks cover 390, 1101, 1280, and 1440 pixels. |
| Telemetry trusted Content-Length and parsed an otherwise unbounded body. | Actual streamed UTF-8 bytes are limited to 2 KiB; oversized streams are cancelled. |
| Telemetry spread unvalidated extra properties into logs, permitting forged event names and arbitrary content. | Logs explicitly select validated properties; paths also reject fragments. |
| Rejected beacon queues lost metrics, and rejected fetch delivery could create unhandled errors. | Rejected beacons fall back to fetch; failed delivery is handled. |
| Idle PostgreSQL pool errors had no listener and could terminate the server outside query error handling. | A generic pool error listener handles the event without logging connection details. Later queries can use replacement connections. |
| The npm audit reported three vulnerable transitive packages. | Compatible lockfile updates for brace-expansion, js-yaml, and nanoid reduce the reported count to zero. |

The URL and blocked-storage browser regressions were first run against the
original production build and failed, then passed against the corrected build.
The schedule clipping was also confirmed by visual inspection.

## Verification

- `make web-check`: ESLint, TypeScript, Vitest, and production build.
- Web tests with `SPORTSBALL_RUN_WEB_DATABASE_TESTS=1`: real read-only queries
  against the populated historical database, including game, player, team,
  history, advanced analytics, schedule strength, and combination contracts.
- `make pipeline-check`: Ruff, formatting, Pyright, and Python tests.
- All 96 Python tests passed with database tests enabled against a newly created
  isolated scratch database. All migrations applied successfully there.
- All 14 Playwright tests passed, including the eight existing navigation,
  rendering-size, scroll, mobile-navigation, and interaction-performance tests.
- A Chromium route sweep checked 36 routes/states at 1280 and 390 pixels in dark
  and light themes (144 checks). It detected no failed page responses, uncaught
  page errors, document overflow, unlabeled selects, or broken loaded images.
  Representative screenshots were inspected, including the corrected schedule.
- Route coverage included home, standings, games, playoffs, directories, team
  and player profiles/trends/game logs, comparisons, all three analytics entity
  types, metric guide, four draft views, five history sections, lines/pairings,
  one combination detail, and scoring/box-score/advanced game views.
- `npm audit`: zero reported vulnerabilities after compatible updates. This
  advisory result applies to the npm dependency tree, not a separate Python
  vulnerability scan.
- Historical completeness: all 21 seasons from 2005–06 through 2025–26 passed,
  with zero errors and three documented source-warning groups involving 41
  unmapped play-by-play participant references.

## Operational limitations

The current-data health check reports four errors: no completed audited daily
update, stale schedules, stale official standings, and stale MoneyPuck data.
There are no stuck ingestion runs and no missing recent final-game records.
These are local freshness findings, not failures of the historical completeness
check. The audit did not refresh source data or activate scheduled writes.

Production hosting, access controls, managed backups, deployment, and scheduler
activation remain deferred under the repository agreement. The recovery scripts
were reviewed; a full archive backup/restore drill was not performed. Browser
coverage used Chromium; it does not establish Safari/Firefox compatibility or
constitute a complete assistive-technology accessibility audit.

Implementation references:
[Next.js native history integration](https://nextjs.org/docs/app/getting-started/linking-and-navigating#native-history-api)
and [node-postgres pool error events](https://node-postgres.com/apis/pool#error).
