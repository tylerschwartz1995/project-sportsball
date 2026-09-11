# Hosted activation readiness

## Status — September 10, 2026 (Vancouver)

The background-job rollout is ready for Tyler's activation decision. Daily
production ingestion and monthly backup flags are still **false**. No domain
was purchased. This record supplements [hosted preparation](hosted-preparation.md).

## Security hardening

- `main` requires a PR, up-to-date Python/Web/AWS checks, resolved conversations
  and linear history. Administrators are included; force pushes and deletion are
  blocked. No second-person review is required for this solo-maintained project.
- All three hosted jobs use `sportsball-production`, restricted to the `main`
  branch. Database/revalidation secrets are scoped to that environment. The two
  AWS roles trust its exact immutable repository subject and STS audience.
- Every external GitHub Action is pinned to a reviewed commit SHA. Repository
  settings require SHA pinning for future changes.
- Temporary `SportsballHostedRoles` and `SportsballHostedTrustMaintenance`
  permissions were removed from the local IAM user after updating role trust.
  Read-only, local sign-in and existing scoped storage permissions remain.
- Browser responses deny framing and MIME sniffing and restrict referrer and
  device access. CSP authorizes scripts with a fresh server-generated nonce,
  blocks plugins and foreign form targets, and restricts image/network sources.
  Inline styles remain allowed for charts/theme controls; production scripts do
  not allow arbitrary inline code or `eval`. Request headers force dynamic page
  rendering; existing server-side query caching remains available.
- The manual health workflow verifies both AWS role assumptions without writing
  S3 or database data. Both schedule flags remain disabled.

GitHub administrators can still change repository settings; these controls reduce
accidental/unreviewed changes and branch credential exposure, not account-owner
compromise. The deliberate single-backup deletion tradeoff remains unchanged.

## Recovery verification

Neon's historical branching recovery was exercised against production without
rewinding or writing to production. A temporary branch,
`recovery-rehearsal-20260911` (`br-cool-queen-ar26t1o2`), recovered the state at
**2026-09-11 00:55:34.351 UTC**, before the first hosted ingestion. It inherited
0.25–1 CU compute and seven-day history, with one-day auto-delete as a fallback.

Read-only SQL verified all 48 public-table counts against the privately saved
pre-ingestion baseline, all 43 season/phase count and date-range groups, schema
`20260907_0028`, and zero unvalidated public constraints. The SQL verification
completed in 12.67 seconds after branch creation. The temporary branch and its
compute were deleted immediately afterward; only production remains.

This proves recovery of historical application data into a separate endpoint.
It does not claim that production was rewound, that a Vercel endpoint cutover was
performed, or that a recovered Neon Auth session was exercised. The separate
S3 dump restore already passed all matching table/coverage checks locally; see
[its verification record](hosted-preparation.md#manual-rehearsal--2026-09-10).
The single-copy replacement algorithm has failure-path tests and verified AWS
permissions. Its final live rehearsal is recorded in
[backup run 34552621972](https://github.com/tylerschwartz1995/project-sportsball/actions/runs/34552621972).

## Notifications and cost controls

- GitHub Actions email notifications were already enabled for failed workflows
  only, routed to Tyler's configured iCloud address.
- Delivery was verified by repeating the original read-only health failure at
  its old revision: [run 34547003381, attempt 2](https://github.com/tylerschwartz1995/project-sportsball/actions/runs/34547003381/attempts/2).
  Its failure email arrived at 18:52 PDT. This was an intentional notification
  drill, not a new failure of the current release.
- The subsequent [current-release health check](https://github.com/tylerschwartz1995/project-sportsball/actions/runs/34552432266)
  passed: schema matches, zero errors and zero warnings. Anonymous website
  access also redirected to login with private, no-store cache headers.
- Neon's organization spending notification is enabled at **US$10/month**, with
  notices at 80% and 100%. This is an alert, not a spending cap; it uses Neon's
  account notification routing (billing email is separate from the GitHub route).
- AWS budget **Sportsball monthly AWS cost** covers all services in account
  `989240880464`, at **US$5/month**. Emails go to the approved alert address at
  85%/100% actual spend and 100% forecast spend. No resource-stopping budget
  actions are configured. This account-level budget was created in the billing
  console and is managed there, separately from the S3 Terraform stack.
- GitHub's existing Actions budget is **US$0** with paid usage stopped and
  included-usage alerts on. The repository is **public**, and standard hosted
  runners are covered. Repository visibility was inspected, not changed.

Scheduled workflow notifications follow GitHub's creator/cron-editor/reactivator
rules; the workflow owner/cron editor is Tyler's account. Recheck routing if that
changes. A failed-run email does **not** detect a schedule GitHub never starts.
The website displays freshness; independent missed-run monitoring is not enabled.

## Cost review

Planning allowance: **US$6–12/month**, excluding taxes, currency conversion,
unusual transfer, data growth and unrelated account usage. This is a forecast,
not a cap or a measured full month. Rates and account usage were checked during
this rehearsal.

| Resource | Basis | Estimated monthly USD |
| --- | --- | --- |
| Neon database storage | Approximately 8.8 GB at $0.35/GB-month | $3.10 |
| Neon seven-day history | Latest displayed 7.76 GB at $0.20/GB-month; changes with writes | $1.55 |
| Neon compute | Illustrative 15–60 CU-hours at $0.106/CU-hour; website usage and ingestion wakeups vary | $1.59–6.36 |
| S3 backup, sources and Terraform state | Current inventory approximately 2.07 GB; request/transfer allowance and growing archives | $0.05 storage currently; allow $0.10–0.50 overall |
| GitHub Actions | Standard runners in this public repository | $0 |
| Vercel Hobby | Existing personal-use deployment within plan limits | $0 |

Neon billing showed **US$0.38** since September 9, including **1.06 CU-hours**.
GitHub showed **US$0 billable Actions usage** ($2.18 consumed, fully discounted).
AWS's newly created budget reported **US$0 actual spend**; this is delayed billing
information, not proof every request was free. The local IAM user's Cost Explorer
API access is unavailable, so no per-run AWS billing claim is made.

Before the final replacement, S3 inventory included every object version: backup dump plus checksum
2,043,362,719 bytes; three source versions 30,961,672 bytes; fourteen Terraform
state versions 136,767 bytes. Only the database backup is subject to single-copy
retention. Source archives and state versions serve separate recovery purposes.

Dashboard metrics can lag by an hour. The rehearsal includes setup/export work,
so neither the US$0.38 total nor runner memory provides a steady-state Neon bill.
The full ingestion attempt took 10m55s before its standings failure; the successful
recovery took 4m38s with MoneyPuck skipped. Do not present either as a successful
full-season daily benchmark. First scheduled runs should be reviewed for duration,
health, archive growth and provider usage.

## Recovery procedure

1. Pause both schedule flags and `HOSTED_JOBS_ENABLED`; check and cancel any
   already-running job. Preserve audit records, logs, database and source files.
2. For a source/API failure, inspect the parent and child ingestion audits and
   `daily_work` error/retry time. Fix and test the parser first. Rerun the bounded
   failed work after its retry delay; never delete existing data to clear errors.
   See [daily operations](daily-ingestion.md#local-operation-and-recovery).
3. For database corruption, identify a known-good time within Neon's available
   history. Create a **new historical branch** from production at that time.
   Do not press restore/rewind on production as a diagnostic action.
4. Connect to the recovered branch with read-only credentials and verified TLS.
   Compare schema, critical table counts, season/phase coverage and audit history.
   Older snapshots correctly lack later ingestion; freshness warnings alone are
   not evidence that historical recovery failed.
5. If using S3 instead, download the retained dump and checksum, verify SHA-256,
   restore into an isolated PostgreSQL 18 target, and run the same checks. Preserve
   referenced source archives. The application dump excludes separate Neon Auth.
6. Plan a reviewed cutover only after validation: reconcile service-role credentials,
   migrations and any changed Auth endpoint; update Vercel/GitHub connections,
   verify private login and queries, refresh website caches, then replay missing
   ingestion. Do not delete the original production branch during recovery.
7. Delete the temporary branch only after it is no longer needed. Re-enable jobs
   only after health checks and the relevant activation approval.

Seven-day history limits which historical points are available. With monthly S3
backups, falling back to S3 can require re-ingesting up to a month of data, or more
if a backup was missed. There is no certified 24-hour data-loss guarantee. The
four-hour service-recovery target remains an operational target, not a tested
end-to-end website/Auth cutover duration.

## Final activation decision

Only after Tyler approves, set `DAILY_INGESTION_ENABLED=true` and
`DATABASE_BACKUP_ENABLED=true`. `HOSTED_JOBS_ENABLED=true` already permits the
approved manual operations. No workflow file edit is needed for activation.

| Job | Configured cadence | Vancouver interpretation |
| --- | --- | --- |
| Ingestion | Daily at 15:17 UTC | 08:17 PDT / 07:17 PST |
| Backup | First day of each month at 07:17 UTC | 00:17 PDT on the first, or 23:17 PST on the preceding date |

Backups retain one successful dump and checksum. A replacement is uploaded and
verified before prior versions are removed; failure preserves the previous copy.
A missed month does not expire the only successful backup. The old AWS server
proposal remains unused: Oregon has no Lightsail instances or EventBridge rules.

Jamie's live login and real iPhone Home Screen checks remain deferred at Tyler's
request. They are separate app usability checks, not prerequisites for these
background schedules. No messages or sign-in codes were sent to Jamie.

Sources: [Neon pricing](https://neon.com/pricing),
[Neon historical recovery](https://neon.com/docs/guides/branching-pitr),
[GitHub Actions billing](https://docs.github.com/en/actions/concepts/billing-and-usage),
[GitHub workflow notifications](https://docs.github.com/en/actions/concepts/workflows-and-actions/notifications-for-workflow-runs),
[AWS S3 Oregon pricing data](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/us-west-2/index.json).
