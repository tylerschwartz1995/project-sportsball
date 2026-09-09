# Neon database setup

## Scope and configuration

Tyler approved the database transfer, migrations, restricted database credentials,
and database verification on September 8, 2026 (Vancouver time). This approval
covers the database stage only. Website deployment, S3 provisioning, hosted job
secrets, manual ingestion rehearsal and scheduled ingestion remain deferred.

| Setting | Configured value |
| --- | --- |
| Project | `sportsball` / `round-pine-88196694` |
| Branch | `production` |
| Region and plan | AWS Oregon (`us-west-2`), Launch |
| PostgreSQL | Major version 18 |
| Primary compute and project defaults | 0.25–1 CU |
| Automatic sleep | After five idle minutes |
| Restore history | Seven days; retained change history is billed separately |
| Application database | `sportsball`, owned by `neondb_owner` |
| Authentication | Neon Auth enabled in the existing `neondb`; application integration pending |

These compute limits constrain instantaneous capacity, not monthly spending.
The US$7–12/month Neon estimate still depends on actual active compute time,
retained history and storage. The initial restore is not representative of daily
ingestion. Watch usage before enabling unattended operations.

## Transfer and validation

The September 8 local backup (`sportsball-20260909T033308Z.dump`) passed checksum
and full scratch-restore verification before transfer. The compressed archive is
approximately 1.7 GB. PostgreSQL 18 restored it into a newly created, empty Neon
`sportsball` database with no owner/ACL restoration and stop-on-error behavior.
The existing `neondb` and its `neon_auth` schema were preserved.

The restore completed in 442.6 seconds under the approved compute ceiling.
Migrations `0027` and `0028` were then applied as the same owner. Alembic reports
revision `20260907_0028` and no model/schema differences. The local database
remains at its previous revision and was not migrated or replaced.

Verified results:

- All 46 original public tables match their local source row counts.
- The copied database contains 110 season records, 28,510 games and 62,802
  ingestion audit records. Coverage varies by dataset; 110 season records do
  not imply complete game-level coverage for every historical season.
- PostgreSQL reports 8,552,587,264 bytes after restore/migration. This is not a
  measurement of Neon's separately billed history or provider storage accounting.
- All 10 existing application database integration/performance semantics tests
  pass using the restricted `sportsball_web` role through Neon pooling.
- Website and backup writes are denied; website raw-artifact/payload reads are
  denied; ingestion schema creation is denied. New-table default grants were
  checked inside a rolled-back transaction.
- All three service roles have no administrative role memberships, superuser,
  database/role creation, replication or row-security bypass privileges.
- Two direct ingestion connections correctly contend for a session advisory
  lock and release it for the next connection.

The operational health check reports four **freshness errors**, not a clean
production health result: no completed audited daily update, and stale schedule,
standings and MoneyPuck source runs. There are no stuck runs, recent final-game
coverage failures or unfinished core tasks in the copied snapshot. Freshness
must be resolved and rechecked during the separately approved ingestion rehearsal.

## Sleep and reconnection verification

The existing application pool configuration was tested against Neon through the
restricted pooled website URL. After more than five idle minutes, the console
reported `SUSPENDED`. The same application pool then reconnected successfully:

| Query sample | Observed time |
| --- | --- |
| Initial connection while awake | 121 ms |
| Warm query before idle | 14 ms |
| First query after confirmed suspension | 893 ms |
| Following warm query | 14 ms |

These are single samples of a count query over `games`, not page-load guarantees
or an ingestion benchmark. Every query returned the expected website role and
28,510 games. No periodic database polling was used during the idle period.

## Credentials and connection handling

Owner and service credentials are stored only in Tyler's private local
configuration directory, outside Git. No GitHub or Vercel secrets have been set.
Use the existing owner only for reviewed migrations and administration. Use:

- `sportsball_web`: pooled website reads, direct manual health reads;
- `sportsball_ingestion`: direct data updates and session locks;
- `sportsball_backup`: direct database backup reads.

Local psycopg's bundled libpq could not validate Neon using `sslrootcert=system`
on this Mac. Explicit `/etc/ssl/cert.pem` succeeded with `sslmode=verify-full`
and required channel binding. This is a local certificate-path adjustment;
certificate verification was not disabled. The Node application connection
also verified TLS successfully using its existing configuration. Verify the
GitHub runner's certificate store during its future manual rehearsal.

Encoded certificate paths exposed an Alembic ConfigParser interpolation bug.
The migration environment now escapes percent characters only when storing the
URL in the config, preserving its original value when read by SQLAlchemy.
Offline migration tests cover encoded passwords and certificate paths without
using a real credential or making a database connection.

The failed configuration attempt included the owner URL in local tool output.
Tyler subsequently reset the owner password. Verification confirmed that the old
password is rejected and the new owner connection succeeds. Both private local
owner connection files were refreshed, the transfer clipboard was cleared, and
all three service accounts were rechecked successfully. Restricted service
credentials were created after the error and were not printed.

## Remaining rollout work

- Integrate Neon Auth and restrict application access to the two intended users;
  the prepared Basic Auth implementation has not yet been replaced.
- Prepare Vercel, then separately approve deployment and verify private access,
  preview isolation, pooled queries and iPhone Home Screen behavior.
- Review/provision S3 and temporary AWS roles; configure hosted job secrets only
  at that stage. Test a manual daily update and independent backup/restore.
- Test a hosted point-in-time restore. Configuring seven-day history does not
  certify recovery objectives or create seven days of past history immediately.
- Review observed cost and freshness before enabling once-daily ingestion.

## Application login rehearsal — 2026-09-09

Managed Neon Auth email-code integration is prepared with a server-only two-address
allowlist and verified-email checks. Passkeys are deferred. Verify at Sign-up is
now enabled with verification codes. Existing localhost access and the shared email
sender were retained for the authorized local rehearsal.

Tyler's real code arrived and was accepted. The resulting session read statistics
through the read-only web role; anonymous requests were rejected. Logout succeeded,
and replaying the revoked session failed. The app rejected an untrusted Origin.
The email states ten-minute expiry; expiry timing/provider rate limits are not yet
independently tested. Jamie's live verification is deferred at Tyler's request;
no code was sent to her. No hosted website origin, deployment or scheduled writes
were activated. Local session material was removed after logout.

The web SQL role stays read-only and has no access to `neon_auth`; the SDK contacts
Neon's managed Auth service separately. See [hosted preparation](hosted-preparation.md#website-credentials-and-connections)
for the remaining hosted checks and configuration.
