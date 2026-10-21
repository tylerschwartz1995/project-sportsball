# Game pages

The Games directory has season/date controls and week/calendar navigation.
Upcoming matchups show teams and start time without a preview link. Live and
completed games link to `/games/{nhlGameId}`.

The detail page has a compact two-row scoreboard followed by Scoring, Box Score,
Game Flow, Team Stats, Shot Map, and Lines. See [App scope](app-simplification.md)
for exact columns and formulas. Tabs and selectors retain shareable URL state.

- Scoring preserves event order with period, time, team, scorer, assists,
  away–home score, and goal type. It is deliberately not sortable.
- Box Score selects one team and either skaters or goalies, with traditional
  totals and available player-game advanced statistics in one sortable table.
- Game Flow offers five-minute xG pressure and cumulative chances. Pressure
  resets at period boundaries; the displayed trend smooths the trailing 30
  seconds, while interactive values retain the exact five-minute totals.
- Team Stats compares all-situations metrics. Mixed-unit rows are not sortable.
- Shot Map shows both teams' xG-weighted heatmaps on a shared intensity scale,
  with puck goal markers and a dismissible details dialog. It has no shot filters.
- Lines selects team, line type, and minimum TOI without repositioning the page.

## Queries and coverage

The loader retrieves identity and view availability, then only the selected
view's required package. `getGameBoxScore` groups traditional team totals,
skaters, and goalies under the canonical home and away teams. Advanced queries
can select subsets of team, player, shot, and unit data. Box scores request
player analytics to populate their advanced columns. Scoring uses normalized
NHL play-by-play; the retired expandable event timeline is not rendered.

Game Flow uses stored shots and play-by-play. Its expected goals are descriptive
chance quality, not win probability. Shot maps exclude unmodeled or unlocated
attempts from their density field. Team game and shot coverage includes
playoffs; MoneyPuck player-game and unit files are regular-season only. Team
names use the identity for that season. Missing observations remain unavailable.

`GET /api/games/{id}` returns the traditional box-score contract: 400 for an
invalid identifier, 404 for an unknown game, and generic 503 for database failure.
Advanced packages are consumed directly by Server Components. No page calls NHL
or MoneyPuck while rendering.
