# Season statistics

Season statistics are materialized from the canonical game-level facts with Python and
Polars. PostgreSQL stores the results so the website can query them quickly without
recalculating an entire season on every page request.

Run an inclusive range:

```bash
uv run --project pipeline sportsball backfill-game-outcomes 20052006 20252026
uv run --project pipeline sportsball build-season-stats 20052006 20252026
```

Each row is scoped to a season and NHL game type. Regular season (`2`) and playoffs (`3`)
are intentionally separate.

## Skaters

`skater_season_stats` contains one row per player, not one row per player/team. A traded
player therefore has one combined season total, while `teams_played_for` records how many
teams contributed. Team-specific splits remain available from `player_game_stats`.

Counting statistics are summed. Time on ice is only populated when every contributing
game has a time-on-ice value; `time_on_ice_games` makes that coverage explicit. Faceoff
percentage is not aggregated because the game feed does not provide the attempts needed
to calculate a correctly weighted season percentage.

## Goalies

`goalie_season_stats` excludes dressed backups who did not play. A goalie participates
when the game row has positive time on ice, shots against, or a decision. Save percentage
is recalculated as total saves divided by total shots against rather than averaging game
percentages.

## Teams

`team_season_stats` contains game counts, wins, losses, goals, and shots. The canonical
game's `last_period_type` retains the NHL's `REG`, `OT`, or `SO` ending classification.
That supports separate regulation, overtime, and shootout wins and losses.

For regular-season standings, `standings_points` awards two points for every win and one
point for every overtime or shootout loss. The same outcome columns are populated for
playoff aggregates for analytical consistency, but standings points are not used to rank
playoff teams.

`wins` and `losses` are analytical totals across every ending type. In an NHL standings
display, `regulation_losses` is the displayed `L`; adding `overtime_losses` and
`shootout_losses` gives the displayed `OTL`. Regulation-plus-overtime wins (`ROW`) comes
from adding `regulation_wins` and `overtime_wins`. The individual fields are retained so
historical tie-breaking rules can be applied explicitly.

## Refresh behavior

The build is idempotent. Within one database transaction it replaces only the requested
seasons, leaving other seasons untouched. Every run is recorded in `ingestion_runs`, and
the job reconciles skater points, goalie decisions, team game outcomes, and outcome
breakdowns before writing.
