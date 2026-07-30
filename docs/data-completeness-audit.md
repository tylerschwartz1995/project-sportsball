# Data-completeness audit

The read-only completeness audit verifies that the stored datasets required by
the website agree with one another. It does not call an upstream provider and
does not modify PostgreSQL.

Run the complete historical range:

```bash
uv run --project pipeline --frozen sportsball \
  audit-data-completeness 20052006 20252026
```

Run a smaller inclusive range by changing the two NHL season identifiers. Add
`--warnings-as-errors` when a deployment or scheduled check should fail for
warnings as well as errors.

## Checks

For every requested season, the audit verifies:

- the schedule checkpoint is complete and its expected game count equals the
  stored regular-season and playoff game count;
- every completed game has exactly two canonical team-game rows, a play-by-play
  timeline, and a regulation/overtime/shootout ending type;
- team-game identities agree with the two teams in the canonical game;
- materialized team, skater, and goalie season statistics exist and the
  derived team game totals reconcile to the box scores;
- NHL-published standings and player season statistics exist;
- every player participating in a box score has an enriched player profile;
- MoneyPuck tables and resumable backfill states are complete wherever that
  provider publishes coverage;
- Polars-derived season line and pairing aggregates exist wherever MoneyPuck
  line-game records exist.

MoneyPuck expectations are source-aware. Shot checks begin with 2007–08.
Season summaries, team games, player games, and line/pairing checks begin with
2008–09. Earlier absence is reported as `n/a`, not as a failure.

## Results and exit status

Each season reports `PASS`, `WARN`, or `FAIL`, followed by the relevant record
counts. Missing required data is an error and makes the command exit with
status 1. A warning documents retained source ambiguity without making the
default command fail.

The initial complete audit on July 29, 2026, passed all 21 seasons from
2005–06 through 2025–26 with zero errors. It reported 41 unmapped NHL
play-by-play participant references: 19 in 2007–08, 21 in 2008–09, and one in
2009–10. These are expected warnings because the pipeline preserves the
provider player ID even when neither the game roster nor the player endpoint
can supply a canonical player.

Database constraints already prevent the duplicate and orphaned canonical
facts covered by foreign keys and unique keys. The audit adds cross-table and
coverage checks that those constraints cannot express.
