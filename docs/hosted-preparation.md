# Neon, Vercel and GitHub Actions preparation

## Selected setup and status

This replaces the Lightsail/CodeBuild/EventBridge proposal. Neon database setup is now in progress following explicit approval. Vercel
deployment, S3 resources, new IAM trust, hosted job secrets and scheduled writes
remain deferred. See [Neon setup](neon-setup.md) for verified deployment status. The previously approved personal
AWS provisioning policies exist, but do not authorize creating this revised
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

Neon Auth has been selected for the final two-account login experience. The
Basic Auth configuration below describes the currently prepared implementation;
replace it with verified Neon Auth integration before website deployment.
Enabling Neon Auth in the console alone does not change application login.

Set Vercel's Root Directory to `apps/web`; use the Next.js preset and default
npm build. Production environment variables:

- `SPORTSBALL_WEB_DATABASE_URL`: Neon **pooled** PostgreSQL URL using the SQL-created
  `sportsball_web` role, database `sportsball`. The application enforces verified
  TLS for Neon, limits each local pool to two connections and allows 15 seconds
  for connection establishment. The SQL role has a 10-second statement timeout;
  the pooled client does not send that setting as a startup parameter. Many
  Vercel instances can still multiply pools.
- `SPORTSBALL_LOGIN_USERS`: private JSON containing exactly two distinct users
  with scrypt hashes. Create it interactively with
  `python3 scripts/hosted/create-login.py /absolute/private/new-login.json`.
  Passwords are entered without terminal echo and are not printed. Save them in
  a password manager; paste the file contents into Vercel's sensitive environment
  variable UI. Never use a `NEXT_PUBLIC_` variable for any credentials.
- `SPORTSBALL_REVALIDATION_TOKEN`: a long random secret also configured in Actions.
  This is separate from the two website passwords.

Vercel production and previews always require login (`VERCEL=1`), regardless of
`SPORTSBALL_PRIVATE_ACCESS`. Missing/malformed login configuration returns 503;
missing/incorrect credentials return a browser Basic Auth challenge. Pages,
APIs, React Server Component requests and static paths are protected; responses
are private/no-store. The exact POST `/api/ingestion/revalidate` instead uses its
existing bearer-token authentication and returns no statistics. Do not exempt
health or other APIs from login. Set `SPORTSBALL_PRIVATE_ACCESS=true` to test
this boundary locally. Local development otherwise remains unchanged.

This preserves the simple browser login prompt, not a user-registration system.
Browsers retain Basic Auth credentials; there is no app logout button. Close the
browser session or clear site credentials to switch users. Never use this over
unencrypted public HTTP. Use long unique passwords. Verify Vercel firewall and
rate limiting behavior during deployment; app password hashing is not a global
brute-force rate limiter. No database connection is needed to reject visitors.

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
