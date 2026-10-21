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

The page has League, Conference, and Division views with one selected group
shown at a time. Columns are Rank, Team, GP, W, L, OTL, PTS, PTS%, RW, Home,
and Away; points is the default sort. Home/Away records require completed-game
coverage matching the official snapshot and are hidden on narrow screens.
Team identities link to their season profiles. The progression chart is retired.

## Opening-season percentages

The NHL may omit points and win percentages for teams with zero games played.
These values remain null through validation, normalization, storage, and the web
query contract; missing percentages are not converted to zero. Teams with games
played must still provide both percentages. Migration `20260930_0029` permits
these undefined values without changing existing snapshots.
