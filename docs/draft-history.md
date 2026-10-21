# Complete NHL draft history

## Source and coverage

Sportsball ingests the official NHL Records draft feed at
`https://records.nhl.com/site/api/draft`. The completed local backfill contains
13,152 selections across all 64 NHL drafts from 1963 through 2026. Every source
row remains part of the archive, including players who never appeared in the
NHL, rows without an NHL player ID, and 95 selections the source marks as
removed outright.

Run an inclusive, idempotent backfill with:

```bash
uv run --project pipeline --frozen sportsball \
  ingest-draft-history 1963 2026
```

The client fetches and validates a complete board one year at a time, retains
each decoded response in `source_payloads` under provider `nhl_records`, and
only replaces the requested years after every response has succeeded. An empty
or mixed-year board fails before normalized data is changed.

## Normalized archive

`draft_selections` stores the official record ID, year, date, round, pick in
round, overall pick, drafting team, player identity and biographical fields,
amateur league and club, and source removal flags. Canonical `players` and
`teams` links are nullable: old team IDs and selected players without an NHL
appearance remain valid draft facts even when no canonical dimension exists.
Exact NHL player-ID matches also enrich the existing player's draft fields.

Traded-pick identity is retained in two forms:

- `pick_owner_history` preserves the source string exactly, including modern
  chains such as `DET-STL-ANA` and legacy prose such as `DAL (from MIN)`;
- `original_pick_owner_abbrev` extracts the first owner for filtering and
  display while `drafting_team_abbrev` identifies the club that made the pick.

## Current use

The draft workspace, outcome queries, charts, and cache have been retired.
`/drafts` now redirects into the main app. The ingestion command, normalized
archive, raw payloads, and player draft metadata remain intact for the separate
database dependency review. Counts above are recorded backfill evidence, not a
fresh audit or data installed by cloning the repository.
