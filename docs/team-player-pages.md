# Team and player pages

The core website exposes traditional season and game statistics through six
server-rendered routes:

- `/teams?season=20252026&phase=regular` provides a sortable
  comparison table for every participating team;
- `/teams/12?season=20252026` shows one team's season and roster splits;
- `/teams/12/games?season=20252026` shows one team's complete game log and
  recent form;
- `/players?season=20252026` lists every participating skater and goalie;
- `/players/8478402?season=20252026` shows a player profile and career history;
- `/players/8478402/games?season=20252026` shows game-by-game performance and
  recent form.

All pages query PostgreSQL directly from React Server Components. Matching JSON
endpoints under `/api/teams` and `/api/players` reuse the same typed query
functions for future consumers.

## Statistical grains

The team directory uses `team_season_stats`, whose grain is one team, season,
and NHL game type. Regular season and playoffs remain separate. Team detail
pages add the NHL-published rows from `official_skater_season_stats` and
`official_goalie_season_stats`. Those are team splits, so a traded player's
contribution to that particular club remains visible.

The player directory uses the Polars-derived `skater_season_stats` and
`goalie_season_stats`. Their grain is one player, season, and game type. A
traded player therefore has one combined total and a `teamsPlayedFor` count.
The player detail page displays those combined rows across the player's full
stored career.

Team game logs join each completed `team_game_stats` row to the opponent's row
for the same game. Player game logs read traditional `player_game_stats` or
`goalie_game_stats` appearances. Both routes retain the historical team
identity active in the selected season and link every row to its supporting
game and team pages.

MoneyPuck game metrics are left-joined to these traditional rows. Team logs add
five-on-five expected-goal share and totals. Skater logs add all-situations game
score, individual expected goals, and on-ice expected-goal share. Goalie logs
add expected goals against and calculate goals saved above expected as expected
goals against minus actual goals against. This left-join design keeps playoff
and older games visible when provider-specific player analytics are not
published.

This distinction is intentional:

```text
team page   -> player contribution to that team
player page -> player total across every team
```

Goalie indexes exclude dressed backups who did not participate. Save
percentage is derived from total saves and shots against, not an average of
game percentages.

## Historical identity

Team queries join `team_seasons` for the requested season. Relocations and
rebrands therefore use the name and abbreviation active at that time, while
the underlying NHL team and franchise identifiers remain stable for linking
and lineage analysis. A team profile queries its available season identifiers
before rendering the selector, so an expansion team cannot navigate to a
season in which it did not participate.

## Directory controls

Team and player directories support URL-based season phase, sorting, and
pagination. The team page intentionally omits search because the full league
fits in one comparison table. Player pages retain name/position search and add
minimum-stat plus birth-country, province/state, and city filters. Filters use
ordinary query parameters, so a result can be bookmarked, shared, and restored
with browser navigation. Player pages show 50 results per page and separate
skater and goalie views.

Every statistics table uses a shared client-side sorter. Column-heading buttons
reorder the visible rows immediately without a route transition; clicking the
active heading reverses its direction. This applies to standings, the player
directory, team rosters, player histories, box scores, advanced game
comparisons, and MoneyPuck season tables. The team directory uses a responsive
comparison table with a sticky team column, sortable headings, and explicit
small-screen sort controls. The underlying traditional-stat response contracts
and statistical grains are unchanged.

Team and player profile pages link to their selected-season game log. Each game
log begins with a compact chronological form strip, then shows the full table
for the selected regular-season or playoff phase. Advanced columns use a dash
when MoneyPuck coverage is unavailable and include an inline coverage note.

Player profiles also visualize rolling performance after every appearance.
The chart shows one selected metric at a time to avoid overlapping scales.
Skaters can choose official scoring and shot rates or individual expected
goals, game score, and on-ice expected-goal share. Goalies can choose official
save/goal rates or expected goals against and goals saved above expected.
Both support 5-, 10-, and 20-game windows plus all, home, and away venue
filters. Advanced rates exclude games where the provider metric is unavailable
rather than treating missing values as zero. Career history appears in separate
regular-season and playoff tables, and the season advanced-analytics section
can be filtered to one game situation.

Team and player detail pages also show the available MoneyPuck season summaries.
See [Advanced analytics presentation](advanced-analytics.md) for the initial
metrics, source attribution, and coverage behavior.

Team profiles present the essential traditional information first: a selected
season-phase summary, the next stored scheduled games, the game-log link, and
an interactive rolling team-form plot. The plot compares all-situations goal
share with five-on-five expected-goal share over a selectable 5-, 10-, or
20-game window. Readers can filter the rolling sample to all, home, or away
games and independently show either available series. Venue filtering happens
before the rolling calculation. The plot recomputes each share from the
underlying rolling totals, shows smaller early-season sample sizes, and follows
the selected regular-season or playoff phase. Sortable official skater and
goalie splits follow the trend.
Advanced team metrics remain below those raw statistics. Covered regular
seasons then show forward lines and defensive pairings with at least 50
five-on-five minutes together. These link to the league-wide season rankings,
which default to a 100-minute minimum and allow alternate thresholds.
