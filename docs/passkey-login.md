# Passkey Login

The opt-in login flow uses Better Auth for passkeys and database-backed sessions.
Neon Auth remains the email-code verifier for first-time setup and recovery.
Only the same two verified, approved email addresses can create accounts or
sessions. No public registration, password, account-linking, or email-change
endpoint is exposed.

## Experience

- Sign in once with an approved email code, then create a passkey.
- Returning visitors remain signed in across browser restarts. Sessions expire
  after 30 inactive days and renew after a day of use. Every protected request
  checks the database and current allowlist; revocation takes effect immediately.
- When needed, select **Sign In with a Passkey** and confirm using the device.
- **First Visit or Use Email** provides setup and recovery.
- **Sign-In Settings** supports adding/removing passkeys and signing out other
  devices. Removing the last passkey does not disable email recovery.
- Logout ends the current session. Browser data clearing/private browsing still
  requires signing in again.

## Activation — not performed by this PR

Keep `SPORTSBALL_PASSKEYS_ENABLED=false` until the following are complete. The
existing Neon email-code login remains the default during preparation.

1. Create a dedicated authentication database in the existing Neon project and
   apply `apps/web/auth/schema.sql` as its owner. Do not apply it to `neon_auth`
   or change existing Neon-managed tables. No hockey data is migrated or removed.
2. Create a restricted `sportsball_auth` login role with CONNECT to that database,
   USAGE on public, and SELECT/INSERT/UPDATE/DELETE on its six `auth_*` tables.
   It must have no schema-creation, role-management, or statistics-write rights.
3. Set `SPORTSBALL_AUTH_DATABASE_URL` to that role's pooled connection URL and
   `SPORTSBALL_AUTH_SECRET` to a new random secret of at least 32 characters.
   Preserve the existing Neon email configuration and two-address allowlist.
4. On a stable HTTPS test hostname, configure `SPORTSBALL_AUTH_ORIGIN` and Neon's
   trusted origin, then enable `SPORTSBALL_PASSKEYS_ENABLED=true`. Do not share
   production credentials with preview deployments.
5. Complete real-device testing below before enabling on production with Tyler's
   approval. Passkeys are tied to a hostname; preview passkeys do not automatically
   work on the production hostname. Users enroll again on the production site.

Existing Neon sessions do not become app sessions. Switching on the new flow
requires one email-code login and passkey setup per account. Switching it off
restores the prior login flow; app session/passkey records are retained.

## Validation

Run after the production build, against a disposable fixture database whose
name ends in `_test`:

```sh
SPORTSBALL_RUN_WEB_FIXTURE_TESTS=1 \
SPORTSBALL_WEB_DATABASE_URL=postgresql://sportsball:sportsball@localhost:5432/sportsball_simplify_test \
npm run test:browser:passkeys --prefix apps/web
```

The runner creates only the six auth tables in that fixture database; it does
not contact hosted auth or send real emails. Its fake email service is used
only by the test server. Never point this suite at production.

Automated Chromium tests use a virtual authenticator and an isolated local auth
store. Cover enrollment, passkey login, persistent cookies, session revocation,
logout, recovery, unauthorized accounts, and blocked cross-origin requests.

Before activation, Tyler should test Safari/iPhone Face ID and desktop Touch ID
(or the device PIN): enroll, sign out, use the passkey, close/reopen the browser,
recover through email, and sign out other devices. Verify both approved accounts.
Automated virtual authenticators do not verify biometric or synced-key UX.

The authentication schema is independent of hockey/Alembic migrations. Back it
up separately before future schema changes. Passkey private keys never reach the
server; the auth store contains public credentials, sessions, and challenges.
