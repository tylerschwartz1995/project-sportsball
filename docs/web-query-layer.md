# Web query layer

Server Components call parameterized, server-only PostgreSQL queries directly.
No page render calls NHL/MoneyPuck or loops through its own HTTP API. Credentials
use `SPORTSBALL_WEB_DATABASE_URL`, never a `NEXT_PUBLIC_` variable. Hosted web
access uses a restricted read role; ingestion has a separate write role.

`database.ts` maintains a bounded pool across development reloads. Queries map
rows to serializable contracts, preserve nullable observations, and use historical
team identities from `team_seasons`. Career records combine all-time summaries
with detailed fallback rows only where a season/phase/kind is missing.

Active modules cover seasons, standings, teams, players, career/search, game
logs, schedules, box scores, play-by-play, advanced leaderboards/game packages,
and team season units. Retired draft, historical-research, playoff-series, and
schedule-strength query modules and APIs have been removed.

## Read endpoints

- `/api/seasons`: detailed-stat season index.
- `/api/standings?season=...`: official regular-season snapshot.
- `/api/games?season=...&date=...`: games on a real ISO date.
- `/api/games/{id}`: traditional box score.
- `/api/teams?season=...` and `/api/teams/{id}?season=...`: totals and roster splits.
- `/api/players?season=...` and `/api/players/{id}`: complete season totals/profile.
- `/api/health`: uncached database and daily-run readiness.

Identifiers and filter values are validated; failures return generic errors
without connection details. Directories may use bounded/paginated reads while
the corresponding JSON contract returns the complete season. Auth, cache
revalidation, and web-vitals handlers have separate access/validation rules.

## Caching and navigation

Reference season lists use one-hour entries. Active page reads use five-minute
entries keyed by complete arguments. `page-cache.ts` and `performance-cache.ts`
wrap only active consumers. Shared reads coalesce concurrent identical work and
remove in-flight entries on success or failure. Ingestion invalidates tagged
entries through the authenticated revalidation endpoint.

HTTP cache headers are distinct from server data-cache policies. Next cache
revalidation can serve stale data while refreshing; these periods are targets,
not hard maximum ages during failures. Main navigation and Basic/Advanced links
preload inactive destinations in production. Development compilation is not a
production navigation measurement.

Game loaders fetch only the selected view's required data and retain availability
flags. Player career and team roster analytics use grouped reads. See
[game pages](game-box-scores.md) and [advanced analytics](advanced-analytics.md).

## Performance telemetry

The root layout samples 10% of browser sessions by default and sends TTFB, FCP, LCP,
CLS, INP, FID, and soft-navigation `NAV_CONTENT` measurements to `POST /api/web-vitals`. The route emits one
structured `web-vital` JSON log entry per accepted metric. Paths exclude query
parameters, while bounded `routeView`, `routeSubView`, and `routePhase`
dimensions distinguish known application views without logging searches,
identifiers, or arbitrary query values. Set `NEXT_PUBLIC_WEB_VITALS_SAMPLE_RATE`
between `0` and `1` at build time to disable or tune sampling.

The endpoint limits the actual request stream to 2 KiB even without a trustworthy
`Content-Length`, rejects query strings and fragments in paths, and logs only
validated fields. Browser delivery falls back to `fetch` if a beacon cannot be
queued, and delivery failures do not become unhandled application errors.

Database reads emit structured `slow-database-query` warnings when they take at
least 250 milliseconds and `database-query-error` warnings when they fail. Logs
include duration, pool-wait time, execution time, route context, row count,
operation, and a stable SQL fingerprint, never SQL
parameters or connection details. Set `SPORTSBALL_SLOW_QUERY_MS` to tune the
threshold. A log drain or hosting log query can aggregate these events into
p50/p95 latency and Core Web Vitals dashboards without changing application
code.

Set `SPORTSBALL_READ_TELEMETRY=1` to log every query and cache read for an
investigation. Cache logs distinguish a fill from a hit, and include route,
cache name, and elapsed time. This verbose mode defaults off. Queries have a
10-second PostgreSQL statement deadline; `SPORTSBALL_QUERY_TIMEOUT_MS` accepts
100–60,000 ms. Connection acquisition retains its separate five-second timeout.
Connections are released on both successful and failed queries.

`NAV_CONTENT` measures an in-app link click or back/forward navigation through
the resolved primary content's hydration and two animation frames. It excludes
closed/on-demand charts and separately streamed optional sections. It is a
content-readiness metric, not a substitute for browser LCP or INP. Measurements
are also available as `sportsball-navigation-content` Performance entries for
local inspection. Reloads continue to use document Web Vitals.

Idle pool failures emit a generic `database-pool-error` warning. The pool removes
the failed connection and can establish a replacement for later requests;
background connection failures do not escape as unhandled error events.


## Validation

`make web-check` runs lint, types, unit tests, and a production build. The fixture
query and browser suites use a fresh migrated synthetic database; the optional
full-archive integration suite exercises known historical records read-only.
Setup is in [Web development](../apps/web/README.md). Historical performance
audit measurements remain in [the dated report](app-performance-improvements.md);
removed test commands in that report are not current validation instructions.
