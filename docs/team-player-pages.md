# Team and player pages

The core website exposes traditional season and game statistics through six
server-rendered routes:

- `/teams?season=20252026` provides a clickable directory grouped vertically
  by division, with the Western and Eastern conferences side by side;
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

The team directory combines regular-season `team_season_stats` participation
with the final stored standings snapshot to assign each club to its conference
and division. Team detail pages add the NHL-published rows from
`official_skater_season_stats` and `official_goalie_season_stats`. Those are
team splits, so a traded player's contribution to that particular club remains
visible.

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

The team directory supports URL-based season selection and loads the selected
season immediately. It intentionally omits search, phase, sorting, and
pagination because every club fits in one browsable conference-and-division
directory. Player pages retain URL-based phase, sorting, pagination,
name/position search, minimum-stat, and birth-country, province/state, and city
filters. Name and position search remain visible as the primary discovery
controls; minimum totals and birthplace filters live in an Advanced Filters
disclosure that opens automatically when one is active. Player pages show 50
results per page and separate skater and goalie views. Each player row also
provides a direct **Compare +** action so a comparison can begin without first
opening a separate builder.

The comparison workspace accepts two to four skaters or two to four goalies.
It starts with suggested season leaders and supports search by player name,
position, or team abbreviation. Selected players occupy numbered slots, and
adding, removing, or clearing a player updates the shareable URL and the
comparison immediately; there is no separate submit step.

Every statistics table uses a shared client-side sorter. Column-heading buttons
reorder the visible rows immediately without a route transition; clicking the
active heading reverses its direction. This applies to standings, the player
directory, team rosters, player histories, box scores, advanced game
comparisons, and MoneyPuck season tables. The team directory instead uses
clickable cards because standings already provide the sortable league-wide
comparison. The underlying traditional-stat response contracts and statistical
grains are unchanged.

Team and player profile pages link to their selected-season game log. Each game
log begins with a compact chronological form strip, then shows the selected
regular-season or playoff phase in a paginated table. The selected sort, sort
direction, page, and 25/50/100-row size live in the URL; each view reports its
visible result range and keeps headings visible inside its bounded table area.
Advanced columns use a dash when MoneyPuck coverage is unavailable and include
an inline coverage note.

Player profiles use URL-backed Overview, Trends, Advanced, All-Time Records,
and Season History views so only one distinct task is presented at a time.
The Trends view visualizes rolling performance after every appearance.
The chart shows one selected metric at a time to avoid overlapping scales.
Skaters can choose official scoring and shot rates or individual expected
goals, game score, and on-ice expected-goal share. Goalies can choose official
save/goal rates or expected goals against and goals saved above expected.
Both support 5-, 10-, and 20-game windows plus all, home, and away venue
filters. Trend metrics, windows, venues, and team-series visibility are stored
in the URL and can be copied directly from the chart.
Advanced rates exclude games where the provider metric is unavailable
rather than treating missing values as zero. Career history appears in separate
regular-season and playoff tables, and the season advanced-analytics section
can be filtered to one game situation.

Team and player detail pages also show the available MoneyPuck season summaries.
See [Advanced analytics presentation](advanced-analytics.md) for the initial
metrics, source attribution, and coverage behavior.

Team profiles use URL-backed Overview, Schedule, Strength, Trends, Skaters,
Goalies, Advanced, and Combinations views. Changing views preserves season and
regular-season/playoff context and fetches only the data needed by the selected
view. The Overview presents an analytical summary of the selected phase rather
than duplicating the specialist tabs. It compares the share of standings
points earned or playoff games won, goals scored, goals allowed, and shot
differential with every participating team. Each measure states its units and
plain league rank rather than relying on percentile jargon;
separates the game record into home, road, one-goal, and extra-time situations;
summarizes each opponent series; and plots every covered game by share of play
and goal differential. The game-level map uses five-on-five expected-goal share
when it preserves the available sample and otherwise falls back to shot share.
Its four result/process groups can be filtered and every game links to its full
record. Regular-season series outcomes use standings points, while playoff
series outcomes use wins. Seasons without stored game-level coverage retain
their league comparison and disclose the missing context.
The Trends view compares all-situations goal share with five-on-five
expected-goal share over a selectable 5-, 10-, or
20-game window. Readers can filter the rolling sample to all, home, or away
games and independently show either available series. Venue filtering happens
before the rolling calculation. The plot recomputes each share from the
underlying rolling totals, shows smaller early-season sample sizes, and follows
the selected regular-season or playoff phase. Dedicated Skaters and Goalies
views contain the sortable official splits. The Advanced view contains team
metrics, while covered regular seasons expose forward lines and defensive
pairings with at least 50
five-on-five minutes together. These link to the league-wide season rankings,
which default to a 100-minute minimum and allow alternate thresholds.
