# Game box scores

Every result on `/games` links to `/games/{nhlGameId}`. The game page keeps one
NHL game as its response grain and displays:

- the historical away and home team identities;
- final scores, shots, game type, ending type, date, and start time;
- one traditional stat row per participating skater;
- goalie totals and even-strength and power-play save splits;
- dressed backup goalies as `DNP` when they recorded no ice time;
- MoneyPuck team and player game analytics where covered;
- normalized shot maps with expected-goal event context;
- regular-season five-on-five forward lines and defensive pairings.

Team and player names link to their existing season and career pages.

## Query model

The page starts its traditional and advanced reads in parallel.
`getGameBoxScore()` runs three independent parameterized queries:

```text
game + team totals
skater game stats
goalie game stats
```

The query layer then groups player rows beneath the game's canonical away and
home team identifiers. This produces one serializable `GameBoxScore` contract
without recalculating any statistics during a web request.

`getMoneyPuckGameAnalytics()` runs six parameterized reads for the game
context, team situations, skaters, goalies, shots, and units. It returns a
separate serializable contract so provider-specific metrics remain distinct
from the source-neutral NHL box score. Team game and shot records cover
playoffs; player-game and unit records are regular-season only.

All team names and abbreviations join through `team_seasons`, so a 2005–06 box
score uses the identity active in 2005–06 rather than a later relocation or
rebrand.

Every displayed table has immediate client-side column sorting. Shot maps are
server-rendered SVG figures and do not require a charting library or a browser
data request.

## Endpoint

```text
GET /api/games/2025030416
```

The endpoint returns 400 for an invalid NHL game identifier, 404 for an
unknown game, and a generic 503 when storage is unavailable. Successful
responses use the same five-minute shared-cache and one-hour
stale-while-revalidate policy as the schedule endpoint.

The endpoint currently returns the traditional `GameBoxScore` contract. The
advanced package is consumed directly by the Server Component and is not yet a
public JSON endpoint.
