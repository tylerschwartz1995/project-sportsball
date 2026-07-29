# Sportsball web

The server-rendered Next.js application for NHL statistics and analytics.

From the repository root:

```bash
npm install --prefix apps/web
npm run dev --prefix apps/web
```

Quality checks:

```bash
make web-check
```

The application reads prepared records from Sportsball storage. It must not
call NHL or MoneyPuck endpoints while rendering user requests.
