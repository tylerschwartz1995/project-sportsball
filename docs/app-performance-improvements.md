# App performance improvements

Implementation of the September 2026 latency audit. All ten primary findings
and both lower-priority findings are addressed. No deployment, ingestion change,
schema migration, or statistical-definition change is part of this work.

## Audit checklist

| Finding | Implementation | Verification |
| --- | --- | --- |
| 1. Player game-season lookup scans/deduplicates the full archive | `UNION ALL` allows the player predicate into each source; the outer distinct season list remains unchanged. | Full-archive before/after equality and query timings. |
| 2. Oversized leaderboard and duplicated mobile markup | Advanced player tables render 50 rows from the existing top-200 sample. Sorting runs across that entire sample before slicing. URL-backed page/sort state is shareable. Player cards and compact tables use one semantic table. | Sorting unit tests, payload/DOM budgets, mobile browser checks. |
| 3. Draft views rebuild unused analytics | View-specific projections omit unused summaries; class rankings omit player outcomes. Five-minute projection caches ignore page/sort changes. Large archives use server-only compression to fit Next's cache-entry limit. Team grouping appends in place instead of repeatedly copying arrays. | Draft definition equality, complete draft browser flows, repeat-page reads. |
| 4. Closed sections still load charts/data | History disclosures dynamically load their code and phase-specific data only when opened. Draft class distribution uses a dynamically imported client chart behind the existing visibility boundary. | Closed-history request budget and open/refresh/selection browser checks. |
| 5. Page reads fetch unrelated views | Game analytics select the requested subview and retain cheap availability flags. Comparison pickers use identities plus batched statistics for up to four selected players. Lines load only the selected unit type. Home advanced queries return five leaders. | Live database equivalence, fallback-subview unit test, page/browser checks. |
| 6. Inconsistent shared caching | Five-minute reads cover player/profile/career/game data, advanced tables, combinations, playoffs, comparisons, and drafts. Team game logs share the profile cache. Existing reference/history caches retain their lifetimes. | Cache hit/fill tests; full browser navigation and database checks. |
| 7. Repeated schedule and combination SQL | Schedule records use one cumulative window per team/season/phase. Rolling units rank eligible team games before joining unit rows. Unit detail filters player membership before canonical sorting. | Before/after full-result equality for schedule, rolling units, and unit detail; SQL plans and timing. |
| 8. Whole-page loading gates useful content | Home player leaders stream independently of primary results. Game score/header/tabs render before advanced/scoring detail resolves. Draft and History headers/controls have explicit results boundaries. Draft boundaries reset with the URL filters so rapid changes cannot retain a pending old view. | Production navigation, full-content checks, and browser error monitoring. |
| 9. Dense link prefetch fan-out | Entity links, pagination, table headers, and shared navigation prefetch on mouse, touch, or keyboard intent. | Idle Lines prefetch budget and navigation/scroll checks. |
| 10. Narrow performance visibility and regression coverage | Route-attributed SQL timing separates pool wait/execution. Cache reads report hits/fills. PostgreSQL statements have configurable deadlines. Resolved primary content emits `NAV_CONTENT`. Browser budgets cover payload, DOM, mobile, deferred requests, and concurrency. | Telemetry, connection release, API validation and cache unit tests; production performance suite. |
| Lower priority: globally loaded feature CSS | History and Playoffs route layouts load their isolated styles. Cross-page primitives stay global; late route overrides retain the original cascade. | Full browser sizing, themes, responsive controls, and overflow suite. |
| Lower priority: eager offscreen logos | Small non-prominent SVG logos use native lazy loading and asynchronous decoding; profile/prominent logos remain eager with explicit dimensions. | Browser layout and logo inspection. |

## Local measurements

These are local optimized-production observations against the populated archive,
not hosted p95 promises. Database comparisons loaded the pre-change source and
the new source against the same read-only database and compared complete JSON
results. The SQL timings below are a paired run; they include client overhead,
and the schedule measurement includes opening a connection. Other concurrent
work and database warmth can change absolute values.

| Read | Before | After | Results |
| --- | ---: | ---: | --- |
| Player game-season IDs, Connor McDavid | 391 ms | 3.2 ms | Identical 11 seasons |
| Los Angeles regular-season schedule | 96 ms | 38 ms | Identical 82 game objects and cumulative records |
| Ten-game rolling forward lines | 55 ms | 35 ms | Identical qualifying rows and aggregates |
| New Jersey line detail | 57 ms | 16 ms | Identical 54 games |

The new rolling query's inspected warm SQL plan completed in about 31 ms with
in-memory sorts; it avoids sorting the full set of unit rows for the season.

| Decoded initial page content | Audit baseline | Implementation observation |
| --- | ---: | ---: |
| Advanced skaters | approximately 1.16 MiB / 4,300 DOM elements | approximately 356 KB / 1,231 DOM elements / 50 table rows |
| Player directory | approximately 564 KiB, duplicate presentations | approximately 328 KB / 1,527 DOM elements / one 50-row table |

Decoded response sizes include HTML and the embedded React server-component
payload. They are not compressed wire sizes. The retained top-200 advanced
sample is unchanged; pagination does not imply an all-player ranking.

Idle Lines navigation produced zero prefetch requests in the final measured
window, compared with 106 in the audit. Initial shared CSS transferred about
33.7 KB after isolating History and Playoffs styles, compared with roughly
36 KiB in the audit. A manual soft-navigation check recorded primary-content
completion at about 96 ms; this is an example, not a percentile estimate.

## Regression budgets and operating policy

Run the optimized build and a separate production server against a populated
local database, then `npm run test:browser:performance --prefix apps/web` with
`SPORTSBALL_E2E_BASE_URL` pointing to it. The suite enforces:

- Advanced skaters: 50 rendered rows, fewer than 2,000 DOM elements, decoded
  response under 500,000 bytes; player directory under 450,000 bytes.
- No history supplement request before its disclosure opens.
- Fewer than 25 idle Lines route-prefetch requests during the measured window.
- Eight warmed representative concurrent responses within three seconds.
- Advanced mobile content visible within six seconds at 390px, four-times CPU
  slowdown, 150 ms emulated latency, and 200 KB/s download throughput.
- Existing 1.5-second tab-navigation and 250-ms interaction budgets, plus scroll
  retention, responsive navigation, and bounded draft rendering.

These budgets are deliberately repeatable local regression limits. They should
be complemented by sampled production measurements when deployment is resumed.
`SPORTSBALL_READ_TELEMETRY=1` enables verbose query/cache logs; it is off by
default. `SPORTSBALL_QUERY_TIMEOUT_MS` defaults to 10,000 and accepts 100–60,000.
`NEXT_PUBLIC_WEB_VITALS_SAMPLE_RATE` controls sampled browser reporting.

`NAV_CONTENT` ends after primary route content resolves and hydrates, followed
by two animation frames. Optional streamed leaders and closed charts are not
part of that metric. Standard document Web Vitals continue separately. Shared
cache revalidation can serve stale data, particularly during database failures;
the documented lifetimes are refresh targets, not hard maximum ages. API HTTP
caching remains a separate policy.

The existing local health warning about a missing audited daily-update run is
a data-readiness condition, not a database connectivity or performance failure.
This work does not activate scheduled writes or change the local archive.

## Validation record

- TypeScript, ESLint, optimized production build, and whitespace checks pass.
- 272 unit/live-database tests pass; six isolated-fixture tests remain reserved
  for the CI fixture database.
- 71 full-archive browser checks pass, including 15 performance checks. Two
  synthetic-fixture browser cases are intentionally skipped locally and run in
  the dedicated CI smoke suite.
- Eight repeated runs of the draft filter/transition regression checks pass.
- Dark/light mobile cards and the navigation content metric were also inspected
  directly. No runtime database errors appeared during the final browser suite.
