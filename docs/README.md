# Documentation index

Reviewed against the repository on September 6, 2026. Current guides describe
implemented behavior; dated audits preserve the evidence and limitations from
those runs. Stored counts refer to the recorded local backfill, not data shipped
with a clone or a guarantee of current source freshness.

## Start here

- [Project overview and local setup](../README.md)
- [Web development and validation](../apps/web/README.md)
- [Agent working agreement](../AGENTS.md)
- [Architecture and system boundaries](architecture.md)
- [Implementation roadmap](roadmap.md)
- [Product backlog and implemented boundaries](product-ideas.md)
- [Current visual design system](design-system.md)
- [Web queries, API contracts, caching, and telemetry](web-query-layer.md)

## Data setup, definitions, and operations

A fresh database needs migrations followed by ingestion; migrations alone do
not populate the website. For detailed history, ingest schedules before box
scores and play-by-play, enrich player profiles, build derived and official
season statistics, and load standings. MoneyPuck imports require matching
canonical game/team/player identities. All-time summaries and drafts are
separate imports. Use each guide's bounded/resumable commands and finish with
the completeness audit for the intended detailed seasons.

- [Source adapters and coverage boundaries](data-sources.md)
- [Schedules, results, and future-season navigation](schedules-results.md)
- [Historical box-score backfill](boxscore-backfill.md)
- [Box-score statistics dictionary](player-statistics.md)
- [Derived season statistics](season-statistics.md)
- [Official player season splits](official-player-season-stats.md)
- [Player profile ingestion](player-profiles.md)
- [Team identities and franchise history](team-identities.md)
- [Official standings snapshots](official-standings.md)
- [Play-by-play ingestion and presentation](play-by-play.md)
- [MoneyPuck downloads, normalization, and provenance](moneypuck-season-ingestion.md)
- [All-time historical summaries and record definitions](historical-statistics.md)
- [Draft archive and outcome definitions](draft-history.md)
- [Historical completeness audit](data-completeness-audit.md)
- [Daily refresh and disabled-by-default scheduler](daily-ingestion.md)
- [Operational data health and HTTP readiness](data-health.md)
- [Backup creation, restore verification, and interrupted-run recovery](database-recovery.md)

The daily coordinator does not refresh the separate historical-summary or
draft archives. A completeness pass also does not establish current freshness,
source licensing, or production readiness. Hosting, production writes, and
predictive modelling remain deferred.

## Website behavior and regression guides

- [Team/player directories, profiles, comparisons, and search](team-player-pages.md)
- [Game box scores, Game Flow, and shot maps](game-box-scores.md)
- [Advanced leaderboards and analytics](advanced-analytics.md)
- [Season and rolling line/pairing rankings](season-line-rankings.md)
- [Filter behavior and regression coverage](filter-consistency.md)
- [Desktop interaction regression checklist](desktop-ux-regression.md)

## Release, audit, and design records

Read these as dated decisions or verification evidence. Their test counts,
health findings, and source measurements do not replace a fresh check. For
current styling use the design system above; later content and usability
records supersede earlier interface descriptions.

- [Original July 31 MVP sign-off and post-release progress](mvp-release.md)
- [September 5 application audit](application-audit-2026-09-05.md)
- [Original Data Workspace design decision — superseded](design-exploration.md)
- [Modern Stats Exploration implementation and sizing/contrast review, PR #142](editorial-style-exploration.md)
- [Pre-change content audit baseline](content-audit-2026-09-06.md)
- [Merged content decisions, PR #143](content-audit-implementation.md)
- [Merged usability decisions and verification, PR #145](usability-audit-implementation.md)

The repository-wide documentation review checked all Markdown files against
routes, components, queries, pipeline commands, migrations, configuration,
workflows, and relevant tests. Current guides were corrected where they had
drifted; original audit evidence and ingestion definitions that still matched
the code were retained. This was a documentation review, not a new data refresh,
full historical audit, backup rehearsal, or browser usability study.
