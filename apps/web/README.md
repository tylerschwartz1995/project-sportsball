# Sportsball web

> **Current visual system:** [Modern Stats Exploration](../../docs/design-system.md),
> with a dark-default graphite theme, light-mode support, and readable statistical tables.

The server-rendered Next.js application for NHL statistics and analytics.

The web server uses a Node-compatible PostgreSQL URL. From the repository root:

```bash
npm ci --prefix apps/web
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

- a server-rendered league homepage with results, upcoming games, standings,
  and top-five scoring, season Game Score, and GSAx leaderboards;
- dedicated sortable NHL standings with overall, conference, and division
  views plus a filterable cumulative-points plot;
- a server-rendered schedule and results page with season/date navigation;
- a curated NHL record book from 1917–18 onward with qualified career and
  single-season skater, goalie, and team rankings, multi-season peaks, record
  progression, decade leaders, scoring context, and era-relative comparisons;
- individual game pages with traditional box scores, scoring summaries,
  expandable play-by-play timelines, advanced team/player results, shot maps,
  forward lines, and defensive pairings;
- a conference-and-division team directory and team detail pages with official
  player splits, MoneyPuck season metrics, complete selected-season schedules, and
  time-aware completed and remaining strength-of-schedule analysis with rest,
  back-to-back, and estimated travel context;
- complete player leaderboards with minimum-stat and birth-region filters,
  plus player profiles with separate regular-season/playoff history and
  situation-filtered MoneyPuck season metrics;
- a searchable two-to-four-player comparison page combining official totals
  with available advanced metrics;
- a complete 1963–2026 draft archive with every official selection,
  traded-pick history, pick-value plots, and true team appearance and 100-game
  rates;
- a historical playoff bracket and postseason skater-and-goalie leader page
  that falls back to standings-based projected matchups before playoff games
  begin;
- team and player game logs with last-ten form summaries, traditional
  box-score metrics, and available MoneyPuck game analytics;
- league-wide MoneyPuck team, skater, and goalie leaderboards with situation
  and minimum-ice-time controls plus persistent section navigation and a
  centralized advanced-metric guide;
- season and rolling 10-, 20-, and 40-team-game forward-line and
  defensive-pairing rankings with league/team and minimum-ice-time filters,
  plus drill-down to every supporting game;
- selectable, keyboard-accessible shot-map events with shooter, result, time,
  goalie, and shot-quality details;
- sortable statistics tables, with server sorting before pagination for the
  player directory and historical rankings; bounded advanced populations are
  labeled so alternate sorts are not mistaken for complete-league rankings;
- Find a Player search across stored profiles from all seasons, with links to
  career history and context-preserving Back to Results navigation;
- URL-backed single-view tabs for long team, player, game, standings,
  postseason, draft, and historical-leader pages;

Team, player, and game summaries link to their supporting detail pages. Team
profile season selectors include stored statistical participation and scheduled
seasons, so future schedules remain available before season totals exist.
The [design system](../../docs/design-system.md) documents the horizontal desktop
navigation, grouped mobile Menu, theme tokens, and shared data components.

JSON endpoints include:

- `GET /api/seasons`;
- `GET /api/standings?season=20242025`;
- `GET /api/games?season=20252026&date=2026-06-14`;
- `GET /api/games/2025030416`;
- `GET /api/teams?season=20252026` and `GET /api/teams/12?season=20252026`;
- `GET /api/players?season=20252026` and `GET /api/players/8478402`;
- `GET /api/playoffs/series?season=20252026&round=4&matchup=1`;
- `GET /api/health` for database and daily-run readiness.

`POST /api/web-vitals` accepts bounded performance telemetry and emits server
logs; it does not write statistics to PostgreSQL. Configuration and contracts
are documented in [Web query layer](../../docs/web-query-layer.md).

Set `SPORTSBALL_RUN_WEB_DATABASE_TESTS=1` alongside the database URL to include
the opt-in PostgreSQL query integration test:

```bash
SPORTSBALL_RUN_WEB_DATABASE_TESTS=1 \
SPORTSBALL_WEB_DATABASE_URL=postgresql://sportsball:sportsball@localhost:5432/sportsball \
  npm run test --prefix apps/web
```

Browser checks require a populated local database and a separately running app;
Playwright does not start a server. Build with `make web-check`, then run:

```bash
SPORTSBALL_WEB_DATABASE_URL=postgresql://sportsball:sportsball@localhost:5432/sportsball \
  npm run start --prefix apps/web
```

In a second terminal:

```bash
(cd apps/web && npx playwright install chromium)
SPORTSBALL_E2E_BASE_URL=http://localhost:3000 \
  npx --prefix apps/web playwright test --config apps/web/playwright.config.ts --workers=1
```

One worker matches the latest full browser verification. Use the same host as
the running app; local development verification used `localhost` to avoid the
hydration issue recorded in the content audit. Full-archive browser and database suites remain opt-in locally. CI also runs
web queries against synthetic migrated fixtures and a desktop/mobile browser
smoke suite in both themes. See [Repository structure and fixtures](../../docs/repository-structure.md)
for reproducible setup and the feature/shared-component organization.

See [Web query layer](../../docs/web-query-layer.md) for the request flow,
contracts, caching, and security boundary.
