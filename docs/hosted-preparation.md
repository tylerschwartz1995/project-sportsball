# Neon, Vercel and GitHub Actions preparation

## Selected setup and status

This replaces the Lightsail/CodeBuild/EventBridge proposal. The approved Neon
restore, database checks and owner credential rotation have completed. Vercel deployment, S3 resources, new IAM trust, hosted job secrets and
scheduled writes remain deferred. See [Neon setup](neon-setup.md) for verified
deployment status. The previously approved personal AWS provisioning policies
exist, but do not authorize creating this revised
stack. Review replacement provisioning permissions and remove obsolete ones
with Tyler before the S3 stage. Keep the old AWS stack unapplied.

| Component | Purpose |
| --- | --- |
| Neon Launch, PostgreSQL 18 | Managed database; compute can sleep between requests |
| Vercel Hobby | Personal Next.js website, including preview deployments |
| GitHub Actions | Once-daily Python ingestion with health checks; daily backup |
| S3 archives/backups | Private versioned original files and independent logical backups |
| S3 Terraform state | Small record of which AWS resources Terraform owns; reuse bootstrap module |
| GitHub OIDC roles | Temporary credentials scoped separately to archive and backup uploads |

Terraform `plan` previews changes; `apply` creates/changes resources and can
start charges. Use `infra/hosted`, not `infra/aws/environment`. Never apply both
stacks to the same buckets. `infra/aws/bootstrap` remains reusable for the state
bucket. The new backend key is `sportsball/hosted-storage.tfstate`; its lock and
state permissions must be reviewed before use. If buckets or the GitHub OIDC
provider already exist, inspect ownership and import them into this stack
instead of recreating or deleting them. No real plan/apply is part of preparation.

## Cost assumptions

Plan for roughly USD10–15/month initially, not a cap or cloud measurement.
Approximately 9 GB local database size implies about $3.15/month at Neon's
$0.35/GB-month; its billed size after restore can differ. An illustrative
20–60 CU-hours at $0.106 costs $2.12–6.36. Restore history depends on changed
bytes and the configured window, and backups add active compute and outbound
transfer. Allow $1–3 for modest S3 usage; retained archives grow without automatic
deletion. Recheck live prices and quotas at provisioning.

Vercel Hobby must remain within its personal/noncommercial limits. GitHub's
private-repository allowance is shared with CI: 30 ingestion runs at 10–15
minutes use 300–450 minutes/month, plus backups, retries and development checks.
Do not promise free Actions without checking remaining allowance. Set billing
alerts and an explicit Actions spending budget; hitting a hard usage limit can
stop ingestion. No domain, tax, unusual data transfer, or extra learning projects
is included. Use the Vercel-provided hostname initially.

## Website credentials and connections

Managed Neon Auth with email codes is the selected login method; passkeys are
deferred. The app now integrates Neon's server SDK and independently requires a
verified email from the two-address allowlist. This is prepared code, not an
activated hosted login. Neon console passkeys authenticate the developer console,
not this app.

Set Vercel's Root Directory to `apps/web`; use the Next.js preset. Configure only
Production, after deployment approval:

- `SPORTSBALL_WEB_DATABASE_URL`: Neon pooled URL for the read-only `sportsball_web`
  role, database `sportsball`. Keep the existing verified TLS and pool limits.
- `SPORTSBALL_ALLOWED_EMAILS`: exactly two distinct, comma-separated email addresses.
  Keep personal addresses out of Git and never use `NEXT_PUBLIC_` configuration.
- `NEON_AUTH_BASE_URL`: the branch's Auth endpoint copied from Neon, not a PostgreSQL
  connection URL. Auth currently lives in `neondb`; statistics stay in `sportsball`.
- `NEON_AUTH_COOKIE_SECRET`: a separately generated secret of at least 32 characters.
- `SPORTSBALL_AUTH_ORIGIN`: exact website origin, e.g. `https://your-site.vercel.app`.
  Register that same origin in Neon's trusted domains before live testing.
- `SPORTSBALL_REVALIDATION_TOKEN`: separate machine bearer secret shared with Actions.

Vercel production and previews always require authentication (`VERCEL=1`), even
when `SPORTSBALL_PRIVATE_ACCESS` is false. Missing configuration fails closed with
503. Local testing uses `SPORTSBALL_PRIVATE_ACCESS=true` at **build and run time**;
normal local development remains open. HTTP auth endpoints are allowed only on
localhost outside Vercel for the isolated test provider.

The login page, bundled static assets and favicon are public. Statistics pages,
APIs and RSC requests require a verified, approved account. Protected responses
are private/no-store. Only the exact ingestion revalidation POST bypasses session
login; that handler still checks its own bearer token. Anonymous requests are
rejected without contacting Neon. Authenticated requests revalidate sessions
with Neon (bypassing its signed session cache), so revocation is prompt, at the
cost of an additional Auth request per protected request. This can add cold-start
latency and compute; no background session polling is used.

Only send-code, verify-code and sign-out POST endpoints are exposed. They require
the configured same-site Origin; arbitrary Neon admin/account APIs are not proxied.
The app requests email delivery only for allowed addresses, but returns a generic
success for other addresses. Neon's upstream signup policy still applies: an
outsider might create a Neon Auth account directly, but receives no Sportsball
access. Enforce verified email and the allowlist on every protected request.
Neon's delivery/OTP attempt limits must be verified in the live rehearsal; this
code does not claim to provide its own distributed rate limiter.

The 2026-09-09 local rehearsal used the real Neon Auth endpoint and the restored
Neon statistics database. Email-code delivery to Tyler, six-digit code verification,
authenticated statistics access (200), anonymous rejection (401), logout (200),
revoked-session rejection (401), and the app's cross-site POST rejection (403)
passed. The delivered email states a ten-minute code expiry; expiry timing and
provider rate limits have not been independently exercised. Jamie's real test is
explicitly deferred until she is available; no code was sent to her.

Neon's existing Allow Localhost setting supports this rehearsal. Verify at Sign-up
is now enabled, using verification codes and Neon's shared email sender. The local
app binds only to loopback; its Auth settings and secret are stored outside Git.
No production website origin has been registered because the site is not deployed.
Before deployment, register the exact chosen HTTPS origin, review localhost access,
verify provider limits, complete Jamie's test, and rehearse the hosted browser flow.
Synthetic browser tests cover desktop/mobile login and logout but do not substitute
for those real-user and hosted checks. The dependency update to Next.js 16.3.4,
sharp 0.35.4 and Vitest 4.1.11 reports zero npm audit vulnerabilities on 2026-09-09;
recheck before deployment.

Do not give untrusted preview code production database credentials or login
configuration. Initially leave preview credentials unset (previews fail closed).
For trusted previews, use a separate scratch Neon branch and distinct credentials,
then verify its permissions. Production secrets belong only to Production.

## Database restore and SQL roles

1. Create a Neon PostgreSQL 18 project in the chosen US West region and a database
   named `sportsball`. Enable scale-to-zero and set a modest compute maximum;
   confirm the selected plan supports the required seven-day restore window and
   explicitly configure it. Seven-day history is a billed setting, not an assumed
   default. Confirm storage can grow beyond the initial database size.
2. Make a fresh local logical dump and verify it in an isolated database. Restore
   to the empty Neon database through a **direct** connection using the owner
   role, `--no-owner --no-acl --exit-on-error`. Do not overwrite the local source
   database. Measure restored bytes, query behavior and compute.
3. Apply release migrations as that same owner, separately from daily jobs.
   Run `infra/neon/database-roles.sql` with psql as the owner afterward. It is
   transactional and intentionally fails if these roles already exist. It creates
   `sportsball_ingestion`, `sportsball_web` and `sportsball_backup` through SQL,
   so they do not inherit Neon console-created administrative roles. Assign
   passwords separately with interactive `\password`; never put them in SQL files.
4. Future migrations must use the same owner so default privileges apply.
   Explicitly review new website SELECT grants; raw source bytes are excluded.
   Test website writes are denied and ingestion cannot change schema.
5. All hosted job URLs use **direct** Neon hostnames (no `-pooler`). Session
   advisory locks do not survive transaction pooling. The adapter rejects pooled
   hosts and the wrong database role, and enforces `sslmode=verify-full` with
   system certificate roots. Use clients with libpq 17+; backup installs PG18.

## GitHub variables, secrets and activation

Repository variables (unset/false during preparation):

| Variable | Value / purpose |
| --- | --- |
| `HOSTED_JOBS_ENABLED` | `true` only after approval for manual hosted rehearsal |
| `DAILY_INGESTION_ENABLED` | `true` only after scheduled ingestion approval |
| `DATABASE_BACKUP_ENABLED` | `true` only after scheduled backup approval |
| `SPORTSBALL_ARCHIVE_BUCKET` | Private archives bucket from Terraform output |
| `SPORTSBALL_BACKUP_BUCKET` | Private backups bucket from Terraform output |
| `SPORTSBALL_INGESTION_AWS_ROLE_ARN` | GitHub archive role from Terraform output |
| `SPORTSBALL_BACKUP_AWS_ROLE_ARN` | GitHub backup role from Terraform output |
| `SPORTSBALL_WEB_URL` | HTTPS production website origin |

Repository secrets:

- `SPORTSBALL_DATABASE_URL`: direct URL for `sportsball_ingestion`.
- `SPORTSBALL_READONLY_DATABASE_URL`: direct URL for `sportsball_web`, manual health only.
- `SPORTSBALL_BACKUP_DATABASE_URL`: direct URL for `sportsball_backup`.
- `SPORTSBALL_REVALIDATION_TOKEN`: same bearer token as the website.

The two-hour temporary AWS session outlasts the 90-minute ingestion timeout.
Jobs only execute on `main`. Every manual and scheduled job requires
`HOSTED_JOBS_ENABLED=true`, and scheduled jobs require their separate schedule
flag. GitHub's OIDC trust permits only this repository's `main` branch with the
AWS STS audience. Pull requests and other branches cannot assume these roles.
Any trusted workflow on main could request that identity, so protect review of
workflow changes. No permanent AWS keys are stored in GitHub. These roles have
object-prefix permissions only, no bucket deletion or infrastructure creation.

Ingestion runs once daily at 15:17 UTC with a 90-minute timeout. Manual reruns
remain available for recovery or delayed source updates. The adapter
verifies schema, runs the existing daily coordinator, checks health even after
an ingestion exit failure, and optionally revalidates website caches. The core
coordinator retains database locks, retries, coverage and audit history.
Independent health checks are manual-only to reduce database wakeups. GitHub
schedule delays/drops can therefore leave stale data without an automatic
freshness alert; the website shows freshness and operators can dispatch health
manually. Verify notifications and choose a separate low-cost freshness/uptime
monitor if unattended missed-run detection becomes a requirement. GitHub failure
notifications alone do not detect a workflow that never started.

Backups run at 07:17 UTC after separate activation, using a dedicated SELECT-only
role and PG18 custom-format dump. The shared backup function uploads a checksum
and S3 object metadata; no backup bytes are uploaded as GitHub artifacts. S3
expires `daily/` backups after 30 days; raw archives have no expiration. Migration
0028 moves only new whole-file artifacts to S3; it does not move or remove old
PostgreSQL bytes. Database and retained source objects must be recovered together.

## Verification and rollout gates

Preparation checks: `make pipeline-check`, `make web-check`, Terraform mock tests,
and CI browser tests with private access enabled, including anonymous and second-user
requests. CI uses synthetic PostgreSQL data. No local data is migrated by this work.

After separate provisioning/deployment approval:

1. Provision only the reviewed Neon/Vercel/S3 resources and permissions. Set cost
   alerts, restore window, scale-to-zero and usage limits before scheduled work.
2. Restore/migrate a copy, configure roles and encrypted connections. Deploy and
   test anonymous rejection, both users, APIs, RSC navigation, preview isolation,
   cache privacy, pooled SQL reads and direct ingestion locks on the real services.
3. Authorize manual rehearsal, keeping both schedule flags false. Measure a
   representative ingestion run (including peak memory and Neon CU-hours), health,
   cache invalidation and backup size/duration/egress. Verify failure notifications.
4. Restore a downloaded backup into a separate scratch target, verify checksum,
   row counts, schema and coverage; test a Neon point-in-time restore separately.
   Initial targets are at most 24 hours lost data and four hours to restore access;
   neither is certified until the hosted rehearsal passes.
5. Review the measured monthly estimate with Tyler, then request final activation
   approval. Confirm the old AWS schedules and job gate are not enabled.

To pause: set both schedule flags and `HOSTED_JOBS_ENABLED=false`; already-running
jobs may continue and require cancellation. Preserve databases and buckets. Use
manual reviewed recovery into a new database, never delete source data to clear an
error. This setup can later move to another runner: the Python coordinator owns
all data logic, while GitHub only schedules and supplies credentials.

Sources: [Neon pricing](https://neon.com/pricing),
[Neon pooling](https://neon.com/docs/connect/connection-pooling),
[Neon role compatibility](https://neon.com/docs/reference/compatibility),
[GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions),
[Vercel Hobby](https://vercel.com/docs/plans/hobby).
