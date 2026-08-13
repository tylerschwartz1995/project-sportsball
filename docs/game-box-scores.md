# Game box scores

Every result on `/games` links to `/games/{nhlGameId}`. The game page keeps one
NHL game as its response grain and displays:

- the historical away and home team identities;
- final scores, shots, game type, ending type, date, and start time;
- one traditional stat row per participating skater;
- goalie totals and even-strength and power-play save splits;
- dressed backup goalies as `DNP` when they recorded no ice time;
- an official NHL scoring summary and expandable period-by-period play
  timeline;
- an interactive MoneyPuck Game Flow view for supported games, with
  five-minute chance-quality pressure, cumulative expected goals, goal
  context, and expected-goal totals by period;
- MoneyPuck team and player game analytics where covered;
- normalized shot maps with expected-goal event context;
- regular-season five-on-five forward lines and defensive pairings.

Team and player names link to their existing season and career pages.
The desktop scoreboard uses flexible team tracks so long historical names,
records, logos, and scores remain visible together instead of being clipped by
the fixed application sidebar.

## Query model

The page starts its traditional box-score, normalized play-by-play, and
advanced analytics reads in parallel.
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

`getGamePlayByPlay()` runs event and participant reads in parallel, keeps the
provider's chronological sort order, and groups semantic player roles beneath
each event. The Server Component derives the scoring summary from normalized
goal events and renders every stored play inside its period section.

For games with MoneyPuck modeled shots, the scoring view also derives a
serializable Game Flow package from the already-loaded shot and play-by-play
records. Game Pressure compares the teams' summed expected goals over the
previous five minutes of play and resets at each period boundary. Cumulative
Chances sums the same shot probabilities from puck drop. Neither measure is a
win probability, and neither makes another upstream request while rendering.
Both chart views use game-relative expected-goal scales so quieter games remain
readable without clipping unusually chance-heavy games. The pressure line is
displayed as a trailing 30-second smoothed trend to reduce event-by-event steps;
hover details continue to report the exact five-minute values.
The chart marks goals, exposes exact values through
pointer, touch, and keyboard interaction, and keeps period totals visible in a
compact non-sortable table because chronological order is meaningful.

All team names and abbreviations join through `team_seasons`, so a 2005–06 box
score uses the identity active in 2005–06 rather than a later relocation or
rebrand.

Every displayed table has immediate client-side column sorting. Shot maps use
regulation half-rink proportions and expose their markers through one keyboard
tab stop plus arrow-key navigation, avoiding a separate tab stop for every
attempt. They do not require a charting library or a browser data request.

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
