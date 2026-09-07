# AWS hosting preparation

## Decision and scope

The selected personal-site architecture is AWS Lightsail (Linux, 2 GB RAM,
60 GB disk) for Next.js and self-managed PostgreSQL; CodeBuild Linux medium
(7 GB RAM) for Python jobs; EventBridge Scheduler; private S3 archives,
backups, and releases; CloudWatch/SNS; Parameter Store; and IAM.
GitHub remains the repository and CI provider. **No AWS infrastructure has
been provisioned and no production jobs have been activated.** The old GitHub
scheduled ingestion workflows are fallback code, not the selected production
scheduler; leave `DAILY_INGESTION_ENABLED` unset/false.

The planning budget is roughly USD 21–29/month before tax, not a spending cap.
It assumes two daily ingestion runs of 10–15 billed minutes and modest logs,
backup storage, and requests. The daily logical-backup job also uses CodeBuild
minutes; measure that and independent health checks during the hosted rehearsal.
Domain registration, retention growth, unusual transfers, and learning
experiments are additional. Budget alerts are account-wide and do not stop
resources. No NAT gateway, load balancer, RDS, or always-on ingestion server is
included. Provision in one region; verify Lightsail bundle availability and
pricing before apply. Default examples use `us-east-1` / `us-east-1a`.

Local September 7 capacity evidence: current database approximately 8.96 GB;
a historical replay refreshed 38 games plus current MoneyPuck archives. A
production Next.js server and PostgreSQL sharing a 2 GiB limit with no swap
completed ingestion in 7m25s while two HTTP clients made 182 successful page
requests. Fifteen browser tests passed. Python ran separately and peaked at
2.32 GB. This supports trying the small server, not a cloud performance SLA.
Build the web image off-server. Keep ingestion on its separate worker.

## Files and boundaries

| Path | Responsibility |
| --- | --- |
| `infra/aws/bootstrap` | Private versioned Terraform state bucket; local bootstrap state initially |
| `infra/aws/environment` | Server/firewall, storage, IAM, jobs, disabled schedules, alerts, budget |
| `infra/runtime` | Production Docker image/Compose, Caddy, SQL roles, CodeBuild buildspec |
| `scripts/aws/prepare-release.sh` | Local packaging of an exact reviewed Git commit; no uploads/deployment |
| `scripts/aws/run-job.py` | Gated AWS adapter with a Systems Manager database tunnel |
| Migration `20260907_0028` | Optional S3 pointers; preserves all existing inline source bytes |

Terraform needs version 1.10 or later; provider versions are locked. Backend
configuration, state, plans, and operator variable files are ignored by Git.
Never put passwords, private SSH keys, SSM activation codes, or application
secret values in Terraform variables, state, buildspecs, user data, or Git.
The `provisioning_approved` / `activation_approved` flags are operational
safeguards, not an IAM security boundary or substitute for Tyler's approval.

## Validate preparation without AWS access

```bash
terraform fmt -check -recursive infra/aws
terraform -chdir=infra/aws/bootstrap init -backend=false
terraform -chdir=infra/aws/bootstrap validate
terraform -chdir=infra/aws/bootstrap test
terraform -chdir=infra/aws/environment init -backend=false
terraform -chdir=infra/aws/environment validate
terraform -chdir=infra/aws/environment test
make pipeline-check
make web-check
```

Terraform tests use mocked providers, not a real account. CI also runs the
migration and PostgreSQL tests against isolated synthetic databases. Do not
supply AWS credentials to CI. Do not run a real Terraform plan/apply during
preparation. Mock validation cannot prove service availability, IAM access,
SSM agent compatibility, region-specific pricing, or successful cloud recovery.

## After explicit provisioning approval

1. Select the AWS account/region, administrator SSH public key and restricted
   IPv4 CIDRs, alert email, and an owned domain. Confirm AWS identity using the
   intended profile before any mutation. Do not use unrelated work credentials.
2. Bootstrap `infra/aws/bootstrap` with a globally unique state bucket name
   and `provisioning_approved=true`. Review the plan before apply. Back up the
   local bootstrap state securely outside Git. The bucket has versioning,
   encryption, public-access blocking, TLS-only policy and destroy protection.
3. Copy `environment/backend.hcl.example` to ignored `backend.hcl` with that
   bucket. Use `terraform init -reconfigure -backend-config=backend.hcl` to
   initialize the remote backend. `use_lockfile=true` uses S3 native locking;
   operator IAM needs lock-object get/put/delete but no state-object delete.
4. Copy `example.tfvars` to an ignored `.auto.tfvars` file, replace every
   placeholder, and set `provisioning_approved=true`. Keep activation,
   schedules, and snapshots false until their separate stages. Review and apply
   the environment plan. A new blank host is not yet a deployed application.
   Confirm the SNS subscription from the email; it cannot alert until confirmed.
5. Package the reviewed commit with
   `scripts/aws/prepare-release.sh COMMIT_SHA /absolute/private/output`.
   It builds a Linux amd64 web image and Git-source ZIP locally. Upload the ZIP
   to the release bucket as `releases/COMMIT_SHA.zip` using `s3api put-object`
   with `--if-none-match '*'`. Do not overwrite an existing release key.
   The source revision variable must match the uploaded commit. Transfer the
   image archive to Lightsail through authenticated SSH, verify its SHA-256,
   and `docker load` it. No CodeBuild GitHub token or CodeConnections is needed.
6. Install/update SSM Agent on the Ubuntu host using the official instructions.
   Create a one-node hybrid activation with the Terraform-output managed-node
   role and `Project=sportsball` (or chosen name) tag. Register this specific
   Lightsail host, confirm it is online and tagged, then delete the unused
   activation. Keep the activation code in a mode-0600 temporary file and erase
   it after registration; never place it in Terraform or shell history. Store
   the resulting `mi-...` ID in the String parameter
   `/sportsball/runtime/managed-node-id`. The IAM role is only for SSM core
   operation; the host receives no general S3 or Parameter Store secret access.
7. Test the custom `sportsball-database-tunnel` SSM session document after the
   database is started. CodeBuild can forward only the host's localhost:5432;
   it has no Run Command or interactive-shell permission. The server firewall
   exposes 80/443 and administrator-only 22, never 5432. CodeBuild uses managed
   networking and the SSM service endpoint, so it needs no VPC NAT gateway.

## Secrets, database, and private website deployment

Create `/opt/sportsball/secrets` and configuration files with root-only
permissions on Lightsail. Copy the reviewed `infra/runtime` assets there.
Docker is installed by the non-secret provisioning bootstrap. Start **only**
PostgreSQL first, with the owner password in
`/opt/sportsball/secrets/database-owner-password`. This is a new empty volume;
never initialize or replace an existing data directory to solve a restore issue.

Take a fresh local logical backup and verify its checksum. Restore into the
new database as `sportsball_owner` with `--no-owner --no-acl`; validate data
counts and run completeness checks. Apply the release's migrations through an
administrator tunnel, **not** the daily job. Run `infra/runtime/database-roles.sql`
as owner after migration to create ingestion, website, and backup roles. Assign
strong distinct passwords with PostgreSQL's interactive `\password` command.
Do not pass passwords as command-line arguments. This one-time role setup is
not a migration and intentionally fails if a role already exists.

Create these **Standard SecureString** Parameter Store values manually using
secure console input (the default AWS-managed SSM encryption key). Terraform
stores only parameter names and the non-secret runtime gate:

| Parameter under `/sportsball/secrets/` | Value |
| --- | --- |
| `ingestion-database-url` | `postgresql://sportsball_ingestion:ENCODED_PASSWORD@127.0.0.1:55432/sportsball` |
| `readonly-database-url` | `postgresql://sportsball_web:ENCODED_PASSWORD@127.0.0.1:55432/sportsball` |
| `backup-database-url` | `postgresql://sportsball_backup:ENCODED_PASSWORD@127.0.0.1:55432/sportsball` |
| `database-owner-password` | Recovery copy of the owner password; no job role can read it |
| `web-environment` | Recovery copy of the root-only web environment file |
| `proxy-environment` | Recovery copy of the root-only Caddy environment file |

`web.env` needs `SPORTSBALL_WEB_DATABASE_URL` pointing to Docker hostname
`postgres:5432`, database `sportsball`, with the **website** role. Do not reuse
the localhost tunnel URI or owner credential. `proxy.env` needs
`SPORTSBALL_DOMAIN`, `SPORTSBALL_USER_ONE`, `SPORTSBALL_USER_TWO`,
`SPORTSBALL_PASSWORD_HASH_ONE`, and `SPORTSBALL_PASSWORD_HASH_TWO`. Generate
password hashes interactively with `caddy hash-password`; never store plain
passwords in Caddy configuration. Single-quote the hash values in `proxy.env`
so Docker Compose preserves their literal dollar signs. Users can be Tyler and his girlfriend.
Caddy Basic Auth protects **every** page and API, including health endpoints,
so unauthenticated visitors cannot read statistics. It provides a simple
browser login prompt, not a custom login screen or account-management system.

Set `WEB_IMAGE=sportsball-web:COMMIT_SHA` outside Git. Validate with
`docker compose -f compose.yaml config --quiet` (avoid dumping resolved secrets),
then start the reviewed web/proxy services. Keep the data volume and Caddy TLS
volume when updating images. Domain DNS must resolve to the static IP before
public TLS validation. Observe the Docker network, firewall, 401 authentication
boundary, HTTPS, full rendered pages, and database roles from a real client.
Local preparation cannot certify these cloud checks.

Website cache expiration remains the existing timed behavior. AWS jobs do not
bypass Basic Auth to call the optional cache-revalidation endpoint. Review
reference/history freshness before activation; if immediate refresh is needed,
prepare a separately authenticated cache-invalidation integration first.

## Rehearsal and activation gates

`activation_approved=false` keeps `/runtime/jobs-enabled=false`, so even manual
CodeBuild invocations fail closed before reading DB credentials or tunneling.
After explicit authorization for the hosted rehearsal, set it true while
`enable_schedules=false`. There is no path where a daily job applies migrations.
Manual ingestion writes to the configured database; use a scratch restored
target for the first hosted rehearsal and update the node/credentials only
after it passes. Run ingestion, health, and backup CodeBuild projects manually.
Verify persisted audit results, S3 references/checksums, logs, failure alerts,
web query consistency, and costs. CodeBuild build commands and CLI output do
not print passwords. Never turn on shell tracing for secret-bearing operations.

Test restoration of an uploaded S3 dump into another isolated database and
compare the expected counts/coverage. A successful `pg_restore --list` during
backup only proves a readable archive catalog, not recoverability. Verify
retrieval of an S3 artifact via `sportsball export-source-artifact ID OUTPUT`.
It fetches the exact recorded version, verifies SHA-256 and length, and refuses
to overwrite an existing file. Backup the database and archive bucket together:
a database dump now contains pointers, not copies of S3-backed source bytes.

Only after final activation approval: enable schedules and automatic snapshots,
confirm the old GitHub daily flag remains false, and confirm the first scheduled
runs/alerts. Schedules are ingestion at 15:17/21:17 UTC, health at 00:47/18:47,
and logical backup at 07:17. Delivery retries feed a dead-letter queue; failed
build alarms and missing-success alarms cover jobs that fail or never run.
The persisted database advisory lock still prevents overlapping daily work.

## Retention and recovery limits

New S3 artifacts use SHA-256 keys, conditional creates, and pinned version IDs.
Uploads complete before PostgreSQL commits their reference. If the transaction
fails, an unreferenced object may remain; retry reuses it. No automated archive
expiration or deletion is allowed, including noncurrent versions. Existing
PostgreSQL artifacts and raw JSON payloads remain where they are. This change
reduces future whole-file growth, not the normalized game tables or indexes.

Daily logical backups expire after 30 days; pre-migration/release backups must
be stored separately outside `daily/` so the daily lifecycle cannot remove
them. The backup job has no delete permission. AWS snapshots retain their
provider-defined daily window. Terraform destroy protection and S3 versioning
help prevent accidents but do not protect against an account-wide compromise.

The selected self-managed configuration replaces the earlier managed-provider
recovery assumption. It targets at most 24 hours of lost data via daily backups
and a four-hour restore, both to be measured on AWS. **Seven-day point-in-time
recovery is not implemented.** Continuous WAL archiving and an independent
failure-domain backup would be additional work; do not describe this plan as
having managed PITR. Pause production activation if the tested restore time,
backup reliability, or this recovery tradeoff is unacceptable.

Rollback: disable schedules and the job gate; preserve all databases, buckets,
and volumes. Restore a backup into a new database and verify before changing
connection parameters. Migration 0028 refuses downgrade while S3-only rows
exist, preventing silent loss of source pointers. Do not remove versions or
force-destroy protected storage to make Terraform apply succeed.

## Primary references

- [Lightsail pricing](https://aws.amazon.com/lightsail/pricing/)
- [CodeBuild runtimes](https://docs.aws.amazon.com/codebuild/latest/userguide/available-runtimes.html)
- [SSM hybrid registration](https://docs.aws.amazon.com/systems-manager/latest/userguide/hybrid-activation-managed-nodes.html)
- [SSM session documents](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-schema.html)
- [Terraform S3 state locking](https://developer.hashicorp.com/terraform/language/backend/s3)
