# Official player season statistics

Player landing responses include NHL-published season totals with one row per
team stint and game type. These rows contain useful fields that cannot always
be reconstructed from the game-center box scores, including game-winning
goals, overtime goals, special-teams points, shooting percentage, and official
goalie rate statistics.

The raw profile responses are already retained by player profile ingestion.
Normalize an inclusive season range without making additional NHL requests:

```bash
uv run --project pipeline --frozen sportsball \
  build-official-player-season-stats 20052006 20252026
```

The build uses Python and Polars, filters the landing-page career history to
NHL rows in the requested range, and transactionally replaces only those
seasons. It maps the published team name through `team_seasons`, preserving
traded-player team splits and historical relocations. The provider's
`sequence` retains the order of multiple team stints.

Two tables keep position-specific fields clear:

- `official_skater_season_stats` stores games, scoring, penalty minutes,
  plus/minus, average ice time, faceoff percentage, game-winning and overtime
  goals, power-play and shorthanded production, shots, and shooting percentage.
- `official_goalie_season_stats` stores games and starts, decisions, goalie
  scoring, penalty minutes, total ice time, goals against, GAA, shots against,
  save percentage, and shutouts.

These official team splits complement rather than replace the independent
`skater_season_stats` and `goalie_season_stats` tables derived from canonical
game facts. Keeping both allows reconciliation and makes the provenance of
every displayed metric explicit.
