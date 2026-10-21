# Roadmap

Reviewed October 21, 2026. [App scope](app-simplification.md) describes the
implemented product; historical release/audit records are evidence, not a backlog.

## Current

The private Vercel/Neon app provides Games, Standings, Teams, and Players.
NHL/MoneyPuck ingestion, historical records, source provenance, health checks,
and local recovery tooling are implemented. Daily production ingestion has been
active since September 30, 2026. Monthly backup scheduling remains disabled.

The repository cleanup removes retired web features and the superseded,
unapplied AWS server deployment. Active hosted storage and operations remain.

## Next: database dependency review

Inventory tables, views, indexes, stored functions, and related grants. Trace
consumers across current pages, APIs, ingestion, audits, backups, and migrations.
Classify candidates as active, operational/provenance, or retired. Propose a
reviewable migration and recovery plan before deleting any material data.
Repository reachability alone does not authorize database deletion.

## Deferred

Predictive modelling, additional sports, new sources, research workspaces, and
saved comparisons require a separate product decision. Do not restore retired
features simply because their underlying data remains stored. Deployment,
operational activation, and merging require the relevant explicit approval.
