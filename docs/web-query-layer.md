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

The standings and games pages call `listSeasons()`, `getStandings()`,
`listGameDates()`, and `getGamesByDate()` directly from Server Components.
They do not make internal HTTP requests to their own APIs. The API routes
reuse the same query functions when an HTTP representation is useful to a
client or future application.

## Implemented modules

```text
apps/web/src/
├── contracts/
│   ├── game.ts
│   ├── season.ts
│   └── standings.ts
├── data/
│   ├── database.ts
│   ├── games.ts
│   ├── seasons.ts
│   └── standings.ts
└── app/
    ├── api/games/route.ts
    ├── api/seasons/route.ts
    ├── api/standings/route.ts
    ├── games/page.tsx
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
available.

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

The season index uses a one-hour shared-cache lifetime. Standings and games use
five minutes with one hour of stale-while-revalidate coverage. Both website
pages are dynamically rendered and read PostgreSQL directly.

## Testing

Run linting, type checking, unit tests, and the production build:

```bash
make web-check
```

Unit tests validate season identifiers, calendar dates, database-row mapping,
parameter use, and API behavior without requiring PostgreSQL. The opt-in
integration test executes the season, standings, schedule-date, and game-result
queries against the real development database:

```bash
SPORTSBALL_RUN_WEB_DATABASE_TESTS=1 \
SPORTSBALL_WEB_DATABASE_URL=postgresql://sportsball:sportsball@localhost:5432/sportsball \
  npm run test --prefix apps/web
```
