# Sportsball web

The server-rendered Next.js application for NHL statistics and analytics.

The web server uses a Node-compatible PostgreSQL URL. From the repository root:

```bash
npm install --prefix apps/web
SPORTSBALL_WEB_DATABASE_URL=postgresql://sportsball:sportsball@localhost:5432/sportsball \
  npm run dev --prefix apps/web
```

Quality checks:

```bash
make web-check
```

The application reads prepared records from Sportsball storage. It must not
call NHL or MoneyPuck endpoints while rendering user requests.

The current read-only slice provides:

- a server-rendered league homepage with recent results, standings and scoring
  leader snapshots;
- dedicated sortable NHL standings with historical season navigation;
- a server-rendered schedule and results page with season/date navigation;
- individual game pages with traditional box scores, advanced team/player
  results, shot maps, forward lines, and defensive pairings;
- a searchable, sortable team directory and team detail pages with official
  player splits and MoneyPuck season metrics;
- complete player leaderboards and player profiles with career history and
  MoneyPuck season metrics;
- league-wide MoneyPuck team, skater, and goalie leaderboards with situation
  and minimum-ice-time controls;
- season-level forward-line and defensive-pairing rankings with team and
  minimum-ice-time filters;
- immediate column sorting on every statistics table;

Team, player and game summaries link to their supporting detail pages. Team
profile season selectors only offer seasons in which that team has stored
statistics, preventing expansion teams from linking to seasons before they
existed.
- `GET /api/seasons`;
- `GET /api/standings?season=20242025`;
- `GET /api/games?season=20252026&date=2026-06-14`;
- `GET /api/games/2025030416`;
- `GET /api/teams?season=20252026` and `GET /api/teams/12?season=20252026`;
- `GET /api/players?season=20252026` and `GET /api/players/8478402`.

Set `SPORTSBALL_RUN_WEB_DATABASE_TESTS=1` alongside the database URL to include
the opt-in PostgreSQL query integration test:

```bash
SPORTSBALL_RUN_WEB_DATABASE_TESTS=1 \
SPORTSBALL_WEB_DATABASE_URL=postgresql://sportsball:sportsball@localhost:5432/sportsball \
  npm run test --prefix apps/web
```

See [Web query layer](../../docs/web-query-layer.md) for the request flow,
contracts, caching, and security boundary.
