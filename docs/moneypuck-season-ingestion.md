# MoneyPuck ingestion

MoneyPuck publishes downloadable advanced-stat datasets for non-commercial
use. Any website view or analysis using these records must clearly credit
MoneyPuck.com. The pipeline fetches only files explicitly linked from the
MoneyPuck download page; it does not scrape unapproved pages.

Sources:

- https://www.moneypuck.com/data.htm
- https://www.moneypuck.com/glossary.htm

Season summaries, team games, player games, and line/pairing records begin
with 2008–09. Shot-level coverage begins one season earlier. Each dataset has
its own bounded or resumable ingestion command.

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

## Shot-level metrics

MoneyPuck shot archives begin with 2007–08 and contain regular-season and
playoff saved shots, missed shots, and goals. Blocked attempts are not included.

```bash
uv run --project pipeline --frozen sportsball \
  ingest-moneypuck-shot-stats 20242025

uv run --project pipeline --frozen sportsball \
  backfill-moneypuck-shot-stats 20072008 20252026
```

`moneypuck_shots` stores modeling-ready expected-goal and outcome
probabilities, coordinates, distance and angle, shot type, rebound and rush
context, strength and score context, shooter, goalie, and canonical team
identities. The exact published ZIP—including every source attribute—is stored
in `source_artifacts`.

## Line and pairing metrics

MoneyPuck's regular-season five-on-five unit archives contain both three-player
forward lines and two-player defensive pairings:

```bash
uv run --project pipeline --frozen sportsball \
  ingest-moneypuck-line-stats 20242025

uv run --project pipeline --frozen sportsball \
  backfill-moneypuck-line-stats 20082009 20252026
```

`moneypuck_line_game_stats` resolves all two or three unit members to canonical
NHL players and stores game-level possession, expected-goal, shot, goal,
danger, score-adjusted, and shot-credit metrics. Exact ZIP sources are retained.

## Completed historical coverage

The initial backfill through 2025–26 is complete:

| Dataset | Coverage | Stored grain |
| --- | --- | --- |
| Season summaries | 2008–09 onward | player/team, season, situation |
| Team games | 2008–09 onward | game, team, situation |
| Player games | 2008–09 onward | game, player, team, situation |
| Shots | 2007–08 onward | game and source shot event |
| Lines and pairings | 2008–09 onward | game, team, unit, situation |

Run the [data-completeness audit](data-completeness-audit.md) to verify these
facts and their durable backfill states alongside the canonical NHL data.
