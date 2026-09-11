# Neon, Vercel and GitHub Actions preparation

## Selected setup and status

This replaces the Lightsail/CodeBuild/EventBridge proposal. The approved Neon
restore, database checks, owner credential rotation and Vercel website deployment
have completed. Approved private S3 storage and GitHub IAM roles were provisioned
on September 10, 2026. Hosted job secrets are configured for the approved manual
rehearsal. The GitHub trust correction is applied, and the first S3 backup and
local recovery test passed. The ingestion recovery run also passed with zero
health errors or warnings. Scheduled writes remain disabled.
See [activation readiness](hosted-readiness.md) for the completed historical
recovery, notification-delivery test, cost controls and final approval checklist.
See [Neon setup](neon-setup.md) for database and website verification and the
storage record below for AWS verification. The three obsolete personal AWS
provisioning policies were detached and replaced with the two reviewed hosted
storage/role policies. Keep the old AWS stack unapplied.

| Component | Purpose |
| --- | --- |
| Neon Launch, PostgreSQL 18 | Managed database; compute can sleep between requests |
| Vercel Hobby | Personal Next.js website, including preview deployments |
| GitHub Actions | Once-daily Python ingestion; monthly backup retaining one successful copy |
| S3 archives/backups | Private versioned original files and independent logical backups |
| S3 Terraform state | Small record of which AWS resources Terraform owns; reuse bootstrap module |
| GitHub OIDC roles | Temporary credentials scoped separately to archive and backup uploads |

Terraform `plan` previews changes; `apply` creates/changes resources and can
start charges. Use `infra/hosted`, not `infra/aws/environment`. Never apply both
stacks to the same buckets. `infra/aws/bootstrap` remains reusable for the state
bucket. The new backend key is `sportsball/hosted-storage.tfstate`; its lock and
state permissions were reviewed before use. If buckets or the GitHub OIDC
provider already exist, inspect ownership and import them into this stack
instead of recreating or deleting them. The approved storage-only apply is recorded below.

## Cost assumptions

The latest planning estimate is USD6–12/month, not a cap or measured full month.
See [activation readiness](hosted-readiness.md#cost-review) for observed provider
charges, storage inventory, current rates and compute assumptions. Neon usage
and retained history depend on activity; source archives grow over time.

Vercel Hobby remains within its personal/noncommercial limits. This repository
is public and uses standard GitHub runners, which currently have no runner charge.
The existing Actions budget stops paid usage above USD0 and included-usage alerts
are on. Revisit allowances if repository visibility or runner type changes.
Neon has a USD10 spending alert; AWS has a USD5 monthly budget alert. These two
alerts do not stop services or cap charges. Domain purchases, taxes, exchange
rates and unrelated account usage are excluded.

## Website credentials and connections

Managed Neon Auth with email codes is the selected login method; passkeys are
deferred. The app now integrates Neon's server SDK and independently requires a
verified email from the two-address allowlist. Hosted login is now active on
the production website. Neon console passkeys authenticate the developer console,
not this app.

Set Vercel's Root Directory to `apps/web`; use the Next.js preset. Configure only
Production (configured under Tyler’s deployment approval):

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
  Still unset until the hosted ingestion stage; revalidation remains unavailable.

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
The exact production origin is now registered, and the hosted browser flow passed
as recorded below. Localhost remains enabled for local development. Remaining
checks include provider limits, Jamie’s login and real iPhone Home Screen behavior.
Synthetic browser tests cover desktop/mobile login and logout but do not substitute
for those real-user and hosted checks. The dependency update to Next.js 16.3.4,
sharp 0.35.4 and Vitest 4.1.11 reports zero npm audit vulnerabilities on 2026-09-09;
recheck before deployment.

Do not give untrusted preview code production database credentials or login
configuration. Initially leave preview credentials unset (previews fail closed).
For trusted previews, use a separate scratch Neon branch and distinct credentials,
then verify its permissions. Production secrets belong only to Production.

## Hosted website verification — 2026-09-09

Production: [Sportsball](https://sportsball-iota.vercel.app).
No custom domain was purchased or configured.

| Setting | Verified configuration |
| --- | --- |
| Vercel project | `sportsball` / `prj_7xy6femy0EzMiWXNxhwnCBjyFMCe` |
| Account scope | `tylerschwartz1995s-projects`, Hobby |
| Git source | `tylerschwartz1995/project-sportsball`, production branch `main` |
| Web root and framework | `apps/web`, Next.js |
| Runtime | Node.js 24, functions in `pdx1` (Oregon) |
| First successful release | `4efecf8`, deployment `dpl_6C5ASuHJgbribD5KuygDhmqHEB1T` |
| Website database identity | `sportsball_web`, pooled connection, read-only |
| Secrets | Six application/Auth settings scoped only to Production |
| Login origin | `https://sportsball-iota.vercel.app`, registered in Neon Auth |

GitHub access was expanded only for Sportsball under Tyler’s approval. The existing
hockey repository selection was preserved. Vercel now builds previews for branches
and Production from `main`; normal repository changes still follow PR review and CI.
Previews have no production credentials. An authenticated operator request through
`vercel curl` confirmed the preview API returns 503 with `Sign-in is not configured`,
`private, no-store` and CDN no-store headers.

The first production build failed at Vercel packaging due to the Next.js 16.3
standalone/adapter conflict ([upstream issue](https://github.com/vercel/next.js/issues/96646)).
`next.config.ts` now uses Vercel’s adapter output on Vercel and keeps standalone
output for Docker. PRs #159 and #160 passed Python pipeline, Web application and
AWS preparation CI before merge; #160 also passed a real Vercel preview build.
The successful production deployment reports Oregon functions. Build machines
can run in a different region from the deployed functions.

Hosted checks passed:

- Anonymous statistics API: 401 with private/no-store headers.
- Anonymous page/RSC request: redirected to the login page.
- Cross-site send-code POST: 403.
- Tyler’s real email code delivered and accepted through the browser form.
- Authenticated overview and player detail rendered restored Neon statistics;
  desktop appearance was visually inspected.
- Browser logout returned to login; revisiting the protected homepage required login.

The earlier local rehearsal additionally verified revoked-session rejection.
A direct post-logout API navigation in the hosted browser was blocked by the browser
client, so it is not counted as a hosted API revocation test. Jamie’s live login,
provider rate-limit/expiry measurements, and a real iPhone Home Screen test remain
unverified. No code was sent to Jamie. Automated desktop/mobile browser checks passed
in CI, but are not a real-device test.

At website deployment, GitHub job variables were unset and hosted job credentials
were not uploaded. They are now configured for the manual rehearsal below;
all scheduled production writes remain disabled. The site serves
the restored snapshot: earlier freshness warnings remain until a separately
approved ingestion rehearsal. Private S3 storage and temporary AWS roles are now
provisioned. The next operational stage is an approved manual ingestion and backup/restore rehearsal
before any schedule activation. The older server stack remains unapplied.

## Private AWS storage — 2026-09-10

Provisioned with Terraform 1.14.7 in account `989240880464`, Oregon (`us-west-2`):

| Resource | Purpose |
| --- | --- |
| `sportsball-989240880464-us-west-2-tfstate` | Terraform resource inventory and state locking |
| `sportsball-989240880464-us-west-2-archives` | Original source files under `raw/` |
| `sportsball-989240880464-us-west-2-backups` | Independent database dumps under `daily/` |
| `sportsball-github-ingestion` | Temporary archive read/write credentials |
| `sportsball-github-backup` | Temporary backup upload credentials |
| GitHub OIDC provider | Lets approved workflow runs obtain temporary AWS credentials |

All three buckets have public access blocked, ACLs disabled, versioning enabled,
AES256 encryption and a policy denying unencrypted HTTP access. Archives have no
expiration. Backups retain one verified successful dump and its checksum. The original
30-day current/30-day noncurrent expiry policy is replaced by explicit cleanup
after a verified replacement, including old versions and delete markers.
Incomplete backup multipart uploads expire after one day.

The roles now trust only
`repo:tylerschwartz1995@70235053/project-sportsball@1315721592:environment:sportsball-production`
with audience `sts.amazonaws.com`, with a maximum two-hour session. Ingestion can
read/write only archive `raw/*`; backup can upload, verify and remove specific
versions only under backup `daily/*`, with version inventory restricted to that
prefix. The historical prefix name does not control the monthly frequency. No permanent AWS keys
were created for jobs. Actual GitHub role assumption and backup/archive uploads were verified during
the manual rehearsal.

The approved `SportsballHostedStorage` and `SportsballHostedRoles` policies were
installed on `tyler-personal`; the three older provisioning policies were detached.
The installed documents matched the approved files exactly. Existing read-only and
local sign-in permissions were preserved. The temporary `SportsballHostedRoles` and inline
`SportsballHostedTrustMaintenance` grants were removed after security hardening.
Future IAM edits require a separately approved elevated session.

Bootstrap applied five resources; the hosted stack applied seventeen, including
Terraform approval metadata. AWS read-back checks verified bucket security, role
trust and prefix permissions. Both data buckets are empty. Terraform state is
stored encrypted and versioned at `sportsball/hosted-storage.tfstate` in the state
bucket. Post-apply plans for both stacks report no changes. Terraform mock tests
passed for both modules; policy validation had no findings and eight permission
simulation scenarios passed before provisioning.

Local operational files are outside Git under `~/.config/sportsball/aws/`:
`hosted-production/` contains the actual hosted backend configuration, while
`hosted-plan-review/bootstrap/terraform.tfstate` remains the bootstrap's local
state and must be preserved. `hosted-plan-review/hosted/` is a review-only local
backend copy and must never be applied. Use the tracked module sources for future
changes; review a fresh plan against the actual backend before applying.

No servers, scheduled jobs, production ingestion or backup uploads were started.
At storage provisioning, repository job variables were unset. Cost alerts and measured job/recovery
checks remain rollout gates before enabling schedules.

## Manual rehearsal — 2026-09-10

Tyler approved configuring job credentials, taking a backup before ingestion,
running ingestion manually and restoring into an isolated local database. The
three restricted database URLs are installed as GitHub secrets. The job adapter
sets the operating system certificate bundle itself, so stored URLs omit
`sslrootcert` while retaining verified TLS. A manual GitHub health run found that
bundled libpq could not locate the runner's trust store using `sslrootcert=system`.
The adapter now explicitly selects the Linux or macOS CA bundle and fails closed
if neither exists. Unit tests cover both paths and missing-bundle rejection;
the corrected GitHub health run verified TLS and schema successfully. It reported
the four known freshness errors before ingestion, not a clean health result.

Both schedule flags remain explicitly `false`. The manual job gate was enabled
for rehearsal. A shared cache-revalidation secret was installed in GitHub and
Vercel production; the existing website was redeployed to load it. The hosted
endpoint rejected an anonymous request with 401 and accepted the configured
bearer token with 200. No secret values are recorded here.

The first backup attempt was cancelled while AWS credential acquisition retried;
it did not reach the database dump step. GitHub's repository OIDC API reports
`use_immutable_subject=true` and this exact `sub_claim_prefix`:
`repo:tylerschwartz1995@70235053/project-sportsball@1315721592`.
The original name-only IAM trust cannot match that subject. Terraform now takes
this verified prefix explicitly and still appends `:ref:refs/heads/main`; it does
not allow wildcard repositories or other branches. Tests cover the immutable
subject, STS audience and wildcard rejection. The reviewed live plan updates only
the two role trust documents (zero creates/deletes). Applying it requires
`iam:UpdateAssumeRolePolicy` on those two roles, which the initial provisioning
user initially lacked. Tyler approved the exact two-role permission, installed
as the inline `SportsballHostedTrustMaintenance` policy. Its document matched the
reviewed JSON. Terraform then updated both roles; a post-apply plan reported no
changes. No resources were created or deleted by the correction.

Both job commands now use GNU `time -v` to record elapsed time, CPU and maximum
resident memory without changing job exit status. Peak memory is a process/child
high-water mark, not the sum of simultaneously running processes or measured
Neon compute. The initial backup attempt predated this instrumentation.
Baseline row counts for all 48 public tables were saved privately for the recovery
comparison. Restore verification will use a new local PostgreSQL 18 database;
it adds no hosted database instance and preserves the existing local database.
The backup retry succeeded in GitHub run
[34548285461](https://github.com/tylerschwartz1995/project-sportsball/actions/runs/34548285461).
It produced 2,043,362,654 bytes (2.04 GB / 1.90 GiB). The dump/checksum/upload
command took 316.44 seconds, with maximum resident memory of 518,432 KiB
(506.3 MiB). This command duration excludes runner setup and package installation.

The S3 download matched both the checksum sidecar and object metadata. A fresh
local PostgreSQL 18 database restored the archive in 176.25 seconds; download,
restore and validation together took 223.12 seconds. All 48 table counts matched,
along with 43 season/phase count and date-range groups. Schema revision was
`20260907_0028`, and no public constraints were unvalidated. The temporary restore
database was removed; existing local and hosted databases were preserved. This
verifies logical recovery of the pre-ingestion application database, not Neon
Auth recovery or a hosted point-in-time restore.

Manual ingestion run
[34548805288](https://github.com/tylerschwartz1995/project-sportsball/actions/runs/34548805288)
started only after the backup upload and downloaded checksum verification passed.
The first full attempt took 654.62 seconds and peaked at 1,062,040 KiB
(1.01 GiB) resident memory. It refreshed schedules and MoneyPuck data, but failed
core publication because NHL returned empty standings for September 11. Cache
refresh was correctly withheld. NHL's `standings-season` calendar places that date
between published periods; April 17, 2026 is the most recent available snapshot,
and its endpoint returns all 32 teams.

Daily ingestion now resolves standings availability from that provider calendar.
In-season runs still fetch the requested date; playoff/offseason gaps use the last
published period's end. Stored standings retain their actual snapshot date. Both
requested/resolved dates and the raw calendar are audited; explicit single-date
standings imports retain their strict original behavior. Invalid calendars or
empty responses for a supported date still fail. Tests verify boundaries,
invalid/future-only ranges and idempotent persistence with provenance. A manual
recovery run reused the already refreshed MoneyPuck data.

Recovery run [34550475285](https://github.com/tylerschwartz1995/project-sportsball/actions/runs/34550475285)
succeeded: health reported zero errors, zero warnings and zero unfinished core
tasks. Its command took 277.75 seconds and peaked at 849,424 KiB (829.5 MiB).
This skipped MoneyPuck and is not a full daily-run benchmark. An earlier recovery
was blocked by the original failure's two-hour retry delay; only that standings
work item's next-attempt time was released for the successful manual retry.
Three versioned source artifacts totaling 30,961,672 bytes were downloaded and
verified against their recorded checksums and lengths. Exact per-run Neon
compute and transfer costs remain unmeasured; runner metrics do not establish
the provider bill.

### Monthly backup retention

Tyler selected one monthly logical backup with one retained successful copy,
rather than daily or weekly history. This fits a personal app whose sports data
can be rebuilt by ingestion. If Neon recovery history is unavailable, recovering
from that independent copy may require re-ingesting up to a month of data.
Neon's seven-day restore history remains configured, and historical application
recovery has now passed; see [the recovery verification](hosted-readiness.md#recovery-verification).
The application dump does not include separate Neon Auth.

The workflow runs on the first of each month at 07:17 UTC once enabled. A unique
candidate is uploaded and its full S3 contents are streamed back for SHA-256
verification, along with byte length, metadata and checksum sidecar checks.
Only then are prior dumps, checksum sidecars, hidden versions and delete markers
removed by explicit version ID. The GitHub concurrency group serializes writers.
A failed upload or verification preserves the prior copy; failed candidates are
cleaned on the next successful run. Cleanup errors fail the job and can leave
extra copies until a retry succeeds. Do not run an independent concurrent writer.

The only successful copy has no age-based expiry, so a missed monthly job cannot
remove it. Incomplete multipart uploads expire after one day. S3 versioning stays
enabled, but the job explicitly removes old backup versions rather than retaining
history. Raw source archives and Terraform state retain their separate policies.
The two production schedule flags remain false; monthly frequency is configured
without starting automatic writes. A logical backup still needs separate restore
validation; checksum verification establishes uploaded-byte integrity.

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
   the operating system certificate bundle. Use clients with libpq 17+; backup installs PG18.

## GitHub variables, secrets and activation

Repository variables (schedules remain false during manual rehearsal):

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

Secrets in the `sportsball-production` GitHub environment:

- `SPORTSBALL_DATABASE_URL`: direct URL for `sportsball_ingestion`.
- `SPORTSBALL_READONLY_DATABASE_URL`: direct URL for `sportsball_web`, manual health only.
- `SPORTSBALL_BACKUP_DATABASE_URL`: direct URL for `sportsball_backup`.
- `SPORTSBALL_REVALIDATION_TOKEN`: same bearer token as the website.

The two-hour temporary AWS session outlasts the 90-minute ingestion timeout.
Jobs only execute on `main`. Every manual and scheduled job requires
`HOSTED_JOBS_ENABLED=true`, and scheduled jobs require their separate schedule
flag. GitHub's OIDC trust permits only this immutable repository's
`sportsball-production` environment with the AWS STS audience. The environment
allows only the `main` branch (not tags). Production secrets live in that
environment, not repository-wide. Pull requests and other branches cannot use it.
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

Backups run on the first of each month at 07:17 UTC after separate activation,
using a dedicated SELECT-only role and PG18 custom-format dump. The shared backup function uploads a checksum
and S3 object metadata; no backup bytes are uploaded as GitHub artifacts. S3
retains one successful backup after verified replacement; raw archives have no expiration. Migration
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
   Monthly S3 fallback can require replaying up to a month of data (longer if a
   backup was missed). Four-hour recovery remains a target; the full website/Auth
   cutover has not been rehearsed. See [the recovery procedure](hosted-readiness.md#recovery-procedure).
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
