# Schedules and results

The games page at `/games` exposes the ingested NHL schedule one day at a
time. A visitor can select any stored season and game date, move to the next
older or newer game date, and see regular-season or playoff matchups.

Each result shows:

- the historical team name and abbreviation active in that season;
- away and home scores;
- away and home shots on goal;
- whether the game ended in regulation, overtime, or a shootout;
- the recorded UTC start time and NHL game identifier.

Completed results link to `/games/{nhlGameId}`, which shows the traditional
box score, NHL scoring summary and full period timeline, plus MoneyPuck
advanced team/player results, shot maps, forward lines, and defensive pairings
wherever the provider publishes coverage.

The underlying read model keeps one game as the response grain. The
`getGamesByDate()` query joins the two participating teams and their
`team_game_stats` rows into one typed `GameSummary`. Result rows are left
joins, so scheduled games can appear before their scores and box scores have
been ingested.

## HTTP endpoint

```text
GET /api/games?season=20252026&date=2026-06-14
```

The season must use the NHL eight-digit key and the date must be a real
`YYYY-MM-DD` calendar date. The endpoint returns 400 for invalid parameters,
404 when that season has no games on the date, and 503 when storage is
temporarily unavailable.

The page reads the database query functions directly as a Server Component.
It does not call this endpoint internally; the JSON representation exists for
future client-side features and other consumers.

Individual box scores are also available as JSON:

```text
GET /api/games/2025030416
```

See [Game box scores](game-box-scores.md) for the player-level grain and
display behavior.
