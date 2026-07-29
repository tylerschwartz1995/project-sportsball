# Player statistics data dictionary

## Principles

- Retain every original NHL box-score payload before normalization.
- Store `null` when the provider omits a statistic; never convert unavailable
  historical data to zero.
- Treat box-score names as source display names. Full player identity and
  biographical enrichment comes from the NHL player-profile endpoint; see
  [Player profile ingestion](player-profiles.md).

Richer NHL-published team splits are stored separately from the derived totals;
see [Official player season statistics](official-player-season-stats.md).
- Persist time on ice as integer seconds and percentages as decimal fractions.
- Build season totals with Polars from game-level facts and materialize them in
  PostgreSQL. See [Season statistics](season-statistics.md) for their grain,
  definitions, and reconciliation rules.

## Skater game statistics

| Database field | NHL box-score field | Meaning |
| --- | --- | --- |
| `goals` | `goals` | Goals scored |
| `assists` | `assists` | Assists recorded |
| `points` | `points` | Goals plus assists |
| `plus_minus` | `plusMinus` | Even-strength/shorthanded goal differential |
| `penalty_minutes` | `pim` | Penalty minutes |
| `hits` | `hits` | Credited hits |
| `power_play_goals` | `powerPlayGoals` | Power-play goals |
| `shots_on_goal` | `sog` | Shots on goal |
| `faceoff_win_percentage` | `faceoffWinningPctg` | Faceoff wins as a decimal fraction |
| `blocked_shots` | `blockedShots` | Credited blocked shots |
| `giveaways` | `giveaways` | Credited giveaways |
| `takeaways` | `takeaways` | Credited takeaways |
| `shifts` | `shifts` | Number of shifts |
| `time_on_ice_seconds` | `toi` | Total time on ice converted from `MM:SS`, nullable when omitted |

Each row also records the game, team, player, position, and sweater number.

## Goalie game statistics

| Database field | NHL box-score field | Meaning |
| --- | --- | --- |
| `starter` | `starter` | Whether the goalie started |
| `decision` | `decision` | Win, loss, or overtime-loss decision when present |
| `goals_against` | `goalsAgainst` | Goals allowed |
| `shots_against` | `shotsAgainst` | Shots faced |
| `saves` | `saves` | Saves |
| `save_percentage` | `savePctg` | Saves divided by shots faced when defined |
| `*_goals_against` | strength-specific goal fields | Goals allowed by strength state |
| `*_saves` | parsed strength shot split | Saves by strength state |
| `*_shots_against` | parsed strength shot split | Shots faced by strength state |
| `penalty_minutes` | `pim` | Goalie penalty minutes |
| `time_on_ice_seconds` | `toi` | Total time on ice converted from `MM:SS` |

Strength states currently retained are even strength, power play, and
shorthanded.

## Team game statistics

The initial team-game slice stores final score and shots on goal. Further team
totals will be added only where the NHL exposes an authoritative value or where
the sum of player rows has a documented definition.

The parent `games` row stores the provider's final-period classification (`REG`,
`OT`, or `SO`). This preserves whether each team-game result ended in regulation,
overtime, or a shootout without duplicating the game-level value on both team rows.

## Coverage notes

The traditional fields above were verified against both a 2005–06 game and a
modern game. Availability can still vary by player, goalie participation, game
state, and historical source quality. Raw payload retention allows the
normalized contract to expand without reacquiring completed games.
