# Web query layer

The web query layer is the read-only boundary between Next.js and normalized
PostgreSQL records. It keeps database credentials and SQL on the server while
returning small, explicit TypeScript contracts to pages and HTTP clients.

## Request flow

```text
browser request
  -> Next.js Server Component or route handler
  -> data query function
  -> parameterized PostgreSQL query
  -> TypeScript response contract
  -> rendered HTML or JSON
```

The standings, games, teams, and players pages call their query functions
directly from Server Components. They do not make internal HTTP requests to
their own APIs. The API routes reuse the same query functions when an HTTP
representation is useful to a client or future application.

## Implemented modules

```text
apps/web/src/
├── contracts/
│   ├── advanced-game.ts
│   ├── advanced.ts
│   ├── game-log.ts
│   ├── game.ts
│   ├── play-by-play.ts
│   ├── playoffs.ts
│   ├── player.ts
│   ├── season.ts
│   ├── standings.ts
│   └── team.ts
├── data/
│   ├── advanced-game.ts
│   ├── advanced.ts
│   ├── database.ts
│   ├── drafts.ts
│   ├── game-logs.ts
│   ├── games.ts
│   ├── history.ts
│   ├── play-by-play.ts
│   ├── playoffs.ts
│   ├── players.ts
│   ├── seasons.ts
│   ├── standings.ts
│   └── teams.ts
└── app/
    ├── api/games/route.ts
    ├── api/games/[id]/route.ts
    ├── api/playoffs/series/route.ts
    ├── api/players/route.ts
    ├── api/seasons/route.ts
    ├── api/standings/route.ts
    ├── api/teams/route.ts
    ├── games/page.tsx
    ├── games/[id]/page.tsx
    ├── history/page.tsx
    ├── players/page.tsx
    ├── players/[id]/page.tsx
    ├── players/[id]/games/page.tsx
    ├── players/compare/page.tsx
    ├── drafts/page.tsx
    ├── playoffs/page.tsx
    ├── teams/page.tsx
    ├── teams/[id]/page.tsx
    ├── teams/[id]/games/page.tsx
    └── page.tsx
```

`database.ts` lazily creates a bounded `pg` connection pool. Keeping the pool
on `globalThis` prevents Next.js development reloads from opening a new group
of connections each time a module reloads.

The query functions use `$1` and `$2` parameters rather than interpolating
request values into SQL. Standings and games join `team_seasons` so a
historical request returns the name and abbreviation used in that season.
Game results left-join `team_game_stats`, allowing the same contract to
represent completed games and future scheduled games whose scores are not yet
available. Each game team also carries a point-in-time phase record derived
from completed results: final games include that result, while scheduled games
stop at the latest completed matchup before their start time. Bounded recent-
game reads select their candidate game identifiers before deriving those
records, so the record calculation only runs for rows that will be returned.

The homepage keeps its season list in the shared Next.js data cache for one
hour and its six-query season package for five minutes. The page remains
dynamically rendered, while repeat visits avoid recalculating unchanged
standings, trends, leaders, results, and upcoming-game records. A cold cache
still reads PostgreSQL directly and never depends on an internal HTTP request.

`history.ts` reads the dedicated all-time summary tables for career totals and
best seasons. Metric names are selected from strict allowlists before they are
used as SQL identifiers. Regular season/playoff, season range, minimum games,
position, team, and known birth-country controls remain parameterized. Career
rate metrics are calculated from the summed numerators and denominators rather
than averaging season rates. The same module supplies complete historical rows
to clickable player profiles. `seasons.ts` exposes separate detailed-stat and schedule
season lists so 1917–2004 summaries do not leak into pages requiring detailed
games, while the future 2026–27 schedule remains selectable on `/games`.

Advanced analytics use two server-only query modules. `advanced.ts` returns
MoneyPuck season summaries for team and player pages.
`advanced-game.ts` returns one game package with team, skater, goalie, shot,
forward-line, and defensive-pairing records. The six parameterized reads run in
parallel, and every returned date and identity is a plain serializable value
safe to pass from a Server Component to a visualization component.
The game page starts this package, the traditional three-query box-score read,
and the normalized play-by-play read together, avoiding a server-side request
waterfall.

`play-by-play.ts` performs event and participant reads in parallel, then groups
semantic player roles beneath each event while preserving NHL sort order. The
serializable result powers both the scoring summary and the expandable
period-by-period timeline without an upstream request.

`getMoneyPuckSeasonUnitLeaders()` reads the Polars-derived unit-season table.
Forward lines and defensive pairings are queried in parallel with an explicit
ice-time threshold, optional team filter, and bounded result limit. Team pages
start this read alongside their traditional and MoneyPuck season queries.

`game-logs.ts` provides selected-season team, skater, and goalie game logs.
Traditional box-score appearances establish the complete row set. MoneyPuck
team and player metrics are left-joined at their matching situation, so an
advanced coverage gap produces nullable metrics rather than a missing game.
The query layer also calculates explicit team results and goalie goals saved
above expected before returning serializable contracts to the pages.

`standings.ts` also derives each team's cumulative regular-season points after
every stored result for the standings history plot. `playoffs.ts` aggregates
official playoff box-score scoring plus series-specific MoneyPuck team-game
metrics. The playoff page groups NHL playoff game
identifiers into series and rounds, then attaches those aggregates to the
matching series in one pass rather than repeating analytics queries per game.
Complete official and shot-model player series tables load through the bounded
`/api/playoffs/series` endpoint only after a player tab is opened, keeping the
initial bracket response compact. The four player queries run in parallel and
are scoped to one validated season, round, and matchup.
If no postseason game has been completed, the page constructs the current
first-round projection from the official standings snapshot instead.

## Configuration

The Python SQLAlchemy URL includes the `+psycopg` driver name. Node's `pg`
client uses a standard PostgreSQL URL instead:

```text
SPORTSBALL_WEB_DATABASE_URL=postgresql://sportsball:sportsball@localhost:5432/sportsball
```

Only server-side modules read this variable. It must never use the
`NEXT_PUBLIC_` prefix. Development can place it in the ignored
`apps/web/.env.local` file or pass it to the `npm run dev` command.

Production and staging should use a dedicated PostgreSQL role limited to
`CONNECT`, schema `USAGE`, and `SELECT` on the tables or views exposed by the
website. The ingestion worker retains a separate write-capable role.

## Endpoints

`GET /api/seasons` returns seasons newest first.

`GET /api/standings?season=20242025` validates the eight-digit NHL season key,
selects the latest regular-season snapshot in that season, and returns teams
in league-rank order. Invalid season syntax returns 400, an absent snapshot
returns 404, and an unavailable database returns a generic 503 without
revealing connection details.

`GET /api/games?season=20252026&date=2026-06-14` validates both the season key
and a real ISO calendar date, then returns the day's games in start-time order.
Invalid input returns 400, a date without games returns 404, and a database
failure returns a generic 503.

`GET /api/games/2025030416` returns one game with its away and home team
totals, skaters, and goalies. A malformed NHL game identifier returns 400 and
an unknown game returns 404.

`GET /api/teams?season=20252026` returns every regular-season team ordered by
derived standings points. `GET /api/teams/12?season=20252026` adds playoff
totals plus NHL-published skater and goalie team splits.

`GET /api/players?season=20252026` returns complete combined-season totals for
participating skaters and goalies. `GET /api/players/8478402` returns the
canonical player profile and all derived regular-season and playoff history.
The `/players` directory uses a separate bounded query path: search, birthplace,
position, minimum-stat filters, sorting, counting, and 50-row pagination run in
PostgreSQL. The complete-season API contract remains unchanged for consumers
that need every skater and goalie.

The season index uses a one-hour shared-cache lifetime. Standings and games use
five minutes with one hour of stale-while-revalidate coverage. Team and player
endpoints use the same policy. Website pages are dynamically rendered and read
PostgreSQL directly. Page renders share one-hour season-list entries and
five-minute standings, standings-history, and team-directory entries through
the Next.js data cache. Cache keys include function arguments, so seasons,
game types, and other query variants remain isolated. These lifetimes match the
daily ingestion model while bounding active-data staleness.

## Performance telemetry

The root layout samples 10% of browser sessions by default and sends TTFB, FCP, LCP,
CLS, INP, and FID measurements to `POST /api/web-vitals`. The route emits one
structured `web-vital` JSON log entry per accepted metric; paths exclude query
parameters. Set `NEXT_PUBLIC_WEB_VITALS_SAMPLE_RATE` between `0` and `1` at
build time to disable or tune sampling.

Database reads emit structured `slow-database-query` warnings when they take at
least 250 milliseconds and `database-query-error` warnings when they fail. Logs
include duration, row count, operation, and a stable SQL fingerprint, never SQL
parameters or connection details. Set `SPORTSBALL_SLOW_QUERY_MS` to tune the
threshold. A log drain or hosting log query can aggregate these events into
p50/p95 latency and Core Web Vitals dashboards without changing application
code.

## Testing

Run linting, type checking, unit tests, and the production build:

```bash
make web-check
```

Unit tests validate identifiers, calendar dates, database-row mapping,
parameter use, game-log and play-by-play mapping, advanced-game unit
classification, and API behavior without requiring PostgreSQL. The opt-in
integration test executes season, standings, schedule, box-score, complete
play-by-play, team, roster, team and player game-log, player-index,
player-career, and complete MoneyPuck advanced-game queries against the real
development database:

```bash
SPORTSBALL_RUN_WEB_DATABASE_TESTS=1 \
SPORTSBALL_WEB_DATABASE_URL=postgresql://sportsball:sportsball@localhost:5432/sportsball \
  npm run test --prefix apps/web
```
