# Sportsball web

The Next.js/React/TypeScript app reads prepared PostgreSQL records. It never
calls NHL or MoneyPuck while rendering. Navigation is Games, Standings, Teams,
Players; `/` redirects to Games. Light is the first-visit default, with saved
dark preferences supported. See [current scope](../../docs/app-simplification.md).

From the repository root:

```bash
npm ci --prefix apps/web
SPORTSBALL_WEB_DATABASE_URL=postgresql://sportsball:sportsball@localhost:5432/sportsball npm run dev --prefix apps/web
```

Next loads `apps/web/.env.local`, not the root Python/Compose `.env`.
Never expose database credentials with a `NEXT_PUBLIC_` variable.

## iPhone Home Screen icon

`src/app/apple-icon.png` is an opaque 180×180 PNG of the blue Sportsball bars
on the dark brand background. Next.js adds the Apple touch icon metadata.
The exact icon route is public so iOS can retrieve it without a session.
The editable source is `assets/app-icon.svg`; iOS supplies the rounded corners.
Regenerate from the repository root after editing the source:

```bash
node -e "require('./apps/web/node_modules/sharp')('apps/web/assets/app-icon.svg').resize(180,180).flatten({background:'#111722'}).png().toFile('apps/web/src/app/apple-icon.png')"
```

After deployment, existing iPhone Home Screen installations may retain their
cached icon. Re-add Sportsball from Safari's Share → Add to Home Screen menu
if the old icon remains.

## Validation

```bash
make web-check
```

This runs lint, types, unit tests, and a production build. For the optional
read-only full-archive query suite:

```bash
SPORTSBALL_RUN_WEB_DATABASE_TESTS=1 SPORTSBALL_WEB_DATABASE_URL=postgresql://sportsball:sportsball@localhost:5432/sportsball npm run test --prefix apps/web
```

The reproducible query/browser suites use synthetic data in a separate database
whose name ends in `_test`. Follow [fixture setup](../../docs/repository-structure.md#reproducible-database-checks),
then build and run:

```bash
(cd apps/web && npx playwright install chromium)
SPORTSBALL_RUN_WEB_FIXTURE_TESTS=1 SPORTSBALL_WEB_DATABASE_URL=postgresql://sportsball:sportsball@localhost:5432/sportsball_web_test npm run test:browser:smoke --prefix apps/web
```

The smoke configuration starts its own production server on port 3100 and test
auth provider on 3200. It checks desktop/mobile navigation in both themes and
private access. Keep those ports free. The retired research-browser suites and
their old general Playwright config have been removed.

[Web query layer](../../docs/web-query-layer.md) documents current JSON endpoints,
caching, telemetry, and access boundaries. [Design rules](../../docs/design-system.md)
and the [regression checklist](../../docs/desktop-ux-regression.md) cover visual review.

## Passkey login

Passkey login is active in production; other environments default to disabled.
See [Passkey rollout and testing](../../docs/passkey-login.md) for setup and rollback.
Use `npm run test:browser:passkeys` with the same isolated fixture database
settings as the smoke suite to exercise a virtual authenticator and sessions.
