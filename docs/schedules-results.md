# Schedules and results

The Games landing page uses season/date controls and a seven-day rail, with
previous/next week navigation and an optional full-month calendar. It shows all
teams and game types on the selected date. Old team/phase parameters no longer
restrict the directory. URL state preserves the selected season and date.

Each result shows:

- the historical team name and abbreviation active in that season;
- away and home scores and shots on goal for completed games;
- each club's season-phase record at that point in the schedule: after the
  result for completed games and through the latest earlier result for
  scheduled games in the read contract. The UI omits pregame record, score,
  and shot placeholders;
- whether the game ended in regulation, overtime, or a shootout;
- the start time in the visitor's browser timezone, with the timezone made
  explicit. UTC remains the stored system value.

Completed results link to `/games/{nhlGameId}`, which shows the traditional
box score, NHL scoring summary and Game Flow, plus MoneyPuck
advanced team/player results, shot maps, forward lines, and defensive pairings
wherever the provider publishes coverage.

The underlying read model keeps one game as the response grain. The
`getGamesByDate()` query joins the two participating teams and their
`team_game_stats` rows into one typed `GameSummary`. The same read derives each
club's cumulative wins, regulation losses, and overtime/shootout losses from
completed games in the matching season and phase. Result rows are left joins,
so scheduled games can appear before their scores and box scores have been
ingested.

The Schedule view on each team profile follows the season and regular-season or
playoff phase selected in the profile header. It displays every stored team game
for that selection in chronological, month-grouped tables, combining completed
results with remaining games. Completed rows show the team result and score; remaining rows show
their state and local start time. Schedule-only future seasons remain available
in the team profile picker even before team season statistics have been loaded.

The complete published 2026–27 regular-season schedule was loaded on July 31,
2026: 1,344 future games from September 29, 2026 through April 10, 2027. The
daily job refreshes the nearer date window for time, venue, and state changes.

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

## Materialized opponent context

The Python `analytics/schedule.py` definition `schedule-context-v1` builds
`schedule_game_context`. Opponent results use strictly earlier current-season
`(start_time_utc, internal game ID)` observations, falling back to the preceding
stored season only when there are no eligible current-season results. Expected
5-on-5 goal share selects its own covered population and season independently;
missing values are not zero, and a covered zero denominator has no share.

Rest follows all regular-season schedule rows ordered by start time and NHL ID.
The retired schedule-strength UI and travel calculations have been removed.
The stored context and builder remain pending the database review. Team names
remain season-aware database joins.
Daily updates refresh the stored context after imports. After standalone source
backfills or migration 0026, run `make analytics-build`. Source observations are
preserved; failed materializations keep the last completed output and a failed
audit run. No predictions or model fitting are included.
