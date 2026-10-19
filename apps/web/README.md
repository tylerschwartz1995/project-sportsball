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

The active app has three destinations:

- **Teams:** sortable basic season stats and an Advanced Stats tab; team
  profiles provide stats, roster splits, and games.
- **Players:** basic season stats with name, type, position, and minimum-games
  filters; an Advanced Stats tab; individual profiles and season history.
- **Games:** schedule/results navigation and completed-game box scores,
  scoring summaries, and advanced game information.

Home opens Team Stats. Season and regular-season/playoff context remain
shareable in URLs. Advanced data retains MoneyPuck attribution and honest
coverage notices. Retired research destinations redirect into the core app.
See [App simplification](../../docs/app-simplification.md) for scope and cleanup
boundaries. Older browser suites that target retired workflows are historical;
CI's fixture smoke suite covers the simplified core in both themes and sizes.

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
are documented in [Web query layer](../../docs/web-query-layer.md). The
[performance improvement report](../../docs/app-performance-improvements.md)
tracks the full latency audit, implementation, and regression budgets.

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
