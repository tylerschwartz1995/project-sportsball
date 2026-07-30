# MoneyPuck season-summary ingestion

MoneyPuck publishes downloadable advanced-stat datasets for non-commercial
use. Any website view or analysis using these records must clearly credit
MoneyPuck.com. The pipeline fetches only files explicitly linked from the
MoneyPuck download page; it does not scrape unapproved pages.

Sources:

- https://www.moneypuck.com/data.htm
- https://www.moneypuck.com/glossary.htm

Season summaries currently begin with 2008–09. Shot-level coverage begins one
season earlier and will be handled by a separate ingestion job.

## Commands

Ingest one season:

```bash
uv run --project pipeline --frozen sportsball \
  ingest-moneypuck-season-summary 20242025
```

Backfill an inclusive range:

```bash
uv run --project pipeline --frozen sportsball \
  backfill-moneypuck-season-summaries 20082009 20252026
```

Use `--max-seasons N` for a bounded run and `--retry-failed` to retry parked
failures. A season is committed only after its skater, goalie, and team files
all validate and map to canonical NHL identities.

## Storage and provenance

The exact CSV bytes are stored in `source_artifacts` with their published URL,
content type, byte count, SHA-256 checksum, fetch timestamp, and ingestion run.
Normalized rows are stored in:

- `moneypuck_skater_season_stats`;
- `moneypuck_goalie_season_stats`;
- `moneypuck_team_season_stats`.

Each table retains the five MoneyPuck situations: `all`, `5on5`, `5on4`,
`4on5`, and `other`. Frequently queried metrics are typed columns. The full
source row is also retained in the `metrics` JSONB column, allowing additional
MoneyPuck metrics to be exposed later without discarding source information.

MoneyPuck player IDs map directly to NHL player IDs. Team abbreviations map
through `team_seasons`; documented source aliases such as `L.A` to `LAK` and
historical `ARI` to `PHX` are explicit rather than fuzzy.

## Metric interpretation

Expected goals estimate the chance an unblocked shot becomes a goal. Corsi
includes all shot attempts, while Fenwick excludes blocked attempts. Player
on-ice percentages describe results while the player is on the ice and should
not be presented as individual production. The website must show MoneyPuck
attribution and metric definitions wherever these values appear.

## Team game-level metrics

The approved all-team game file can be ingested for a bounded season range:

```bash
uv run --project pipeline --frozen sportsball \
  ingest-moneypuck-team-game-stats 20082009 20252026
```

`moneypuck_team_game_stats` stores one row per game, team, and situation for
regular-season and playoff games. It includes expected-goal share, Corsi and
Fenwick share, expected and actual goals, shots and attempts, danger-tier
expected goals, score/venue adjustments, and total shot credit. The exact
all-season CSV remains available in `source_artifacts`.

## Player game-level metrics

MoneyPuck's regular-season skater and goalie archives can be ingested one
season at a time or through a resumable range backfill:

```bash
uv run --project pipeline --frozen sportsball \
  ingest-moneypuck-player-game-stats 20242025

uv run --project pipeline --frozen sportsball \
  backfill-moneypuck-player-game-stats 20082009 20252026
```

Use `--max-seasons N` for a bounded backfill and `--retry-failed` to retry
parked failures. The exact compressed archives are retained in
`source_artifacts`; curated, frequently queried fields are typed in
`moneypuck_skater_game_stats` and `moneypuck_goalie_game_stats`. Each fact
resolves to canonical NHL game, player, team, and opponent identities.

These published player archives contain regular-season games. Team game-level
facts cover both regular-season and playoff games.
