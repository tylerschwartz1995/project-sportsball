# Official NHL standings

The pipeline stores NHL-published standings snapshots separately from
`team_season_stats`. The official rows preserve provider rankings and historical
rule-era fields; the derived table remains the reproducible Polars aggregation
used for analytics.

Ingest any published date:

```bash
uv run --project pipeline --frozen sportsball ingest-official-standings 2006-04-18
```

Backfill the final regular-season snapshot for every stored season in an
inclusive range:

```bash
uv run --project pipeline --frozen sportsball \
  backfill-official-standings 20052006 20252026
```

The historical coordinator derives each snapshot date from the last stored
regular-season game. A season that already has a snapshot is skipped, making
the job safely resumable. Use `--max-seasons N` for a bounded run.

## Identity and replacement rules

The standings response identifies teams by abbreviation rather than numeric
NHL team ID. Each row is mapped through `team_seasons`, so the abbreviation in
effect during that season resolves to the correct canonical team and franchise
lineage. Unknown abbreviations fail the whole snapshot rather than silently
creating a potentially incorrect team.

All rows for a date are validated and normalized with Polars before the
existing date is replaced transactionally. Raw JSON, checksum, fetch time, and
ingestion-run status are retained in the shared audit tables.

`official_standings_snapshots` includes:

- games played, wins, losses, ties, overtime losses, and points;
- regulation wins, regulation-plus-overtime wins, and shootout results;
- goals for, goals against, goal differential, and percentages;
- league, conference, division, and wildcard ranks;
- conference/division labels and clinch indicators.

## Website presentation

The standings header keeps the Presidents' Trophy leader as the primary
season result, then adds conference playoff cut lines and league-wide scoring
context. This avoids repeating the same team for points, wins, and goal
differential while giving the table useful competitive and scoring context.
Every team and cut-line abbreviation links to the supporting historical team
profile.
