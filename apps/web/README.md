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
- dedicated sortable NHL standings with overall, conference, and division
  views plus a filterable cumulative-points plot;
- a server-rendered schedule and results page with season/date navigation;
- individual game pages with traditional box scores, scoring summaries,
  expandable play-by-play timelines, advanced team/player results, shot maps,
  forward lines, and defensive pairings;
- a sortable team directory and team detail pages with official
  player splits and MoneyPuck season metrics;
- complete player leaderboards with minimum-stat and birth-region filters,
  plus player profiles with separate regular-season/playoff history and
  situation-filtered MoneyPuck season metrics;
- a searchable two-to-four-player comparison page combining official totals
  with available advanced metrics;
- a draft-outcomes page with pick-value plots, tracked player outcomes, and
  team drafting-production summaries for the stored NHL player universe;
- a historical playoff bracket and postseason scoring-leader page that falls
  back to standings-based projected matchups before playoff games begin;
- team and player game logs with last-ten form summaries, traditional
  box-score metrics, and available MoneyPuck game analytics;
- league-wide MoneyPuck team, skater, and goalie leaderboards with situation
  and minimum-ice-time controls plus persistent section navigation and a
  centralized advanced-metric guide;
- season-level forward-line and defensive-pairing rankings with team and
  minimum-ice-time filters;
- selectable, keyboard-accessible shot-map events with shooter, result, time,
  goalie, and shot-quality details;
- immediate column sorting on every statistics table;

Team, player and game summaries link to their supporting detail pages. Team
profile season selectors only offer seasons in which that team has stored
statistics, preventing expansion teams from linking to seasons before they
existed. The team profile is also the reference implementation for the shared
sport-neutral visual design system documented in `../../docs/design-system.md`.
The selected Data Workspace shell now provides responsive global navigation,
a persistent light/dark toggle with a dark first-visit default, and native
workspace presentations for the league overview, standings, team and player
directories, primary team and player profiles, and the complete game
directory-to-box-score workflow. Advanced team, skater, and goalie leaderboards
and the metric guide also use the native workspace system.
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
