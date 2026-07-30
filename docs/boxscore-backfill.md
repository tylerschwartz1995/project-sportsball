# Historical box-score backfill

The stored schedule is the source of work for box-score ingestion. Only final
regular-season and playoff games are eligible. A game is considered complete
when it has the two expected `team_game_stats` rows; all player and goalie rows
are written in the same database transaction.

## Run the backfill

Backfill one season:

```bash
uv run --project pipeline --frozen sportsball \
  backfill-game-boxscores 20052006 20052006
```

Run a small, resumable batch:

```bash
uv run --project pipeline --frozen sportsball backfill-game-boxscores \
  20052006 20052006 --max-games 100
```

Retry games previously parked as failures:

```bash
uv run --project pipeline --frozen sportsball backfill-game-boxscores \
  20052006 20052006 --retry-failed
```

The two season arguments are inclusive, so the same command can coordinate
multiple seasons. Schedule ingestion must be complete before box-score
backfilling begins.

## Resume and failure behavior

`boxscore_backfill_games` records each attempted game's status, attempt count,
last error, and completion time. Interrupted `running` games are eligible on
the next invocation. Failed games are parked so one unusual source response
does not stop the rest of the range; `--retry-failed` makes them eligible
again.

The command reports:

- `attempted`: games requested during this invocation;
- `completed`: complete box scores across the requested range;
- `pending`: incomplete games that have not been parked as failures;
- `failed`: incomplete games with a recorded error.

The command exits unsuccessfully only when failures remain and there are no
other pending games. This allows bounded batches to continue through a season
before failed games are reviewed or retried.

## Historical missing values

Older NHL records can omit fields that modern records provide. Missing values
are stored as `NULL`, not zero. For example, some dressed skaters in 2005–06
box scores have no time-on-ice value. Raw payloads remain stored so these
decisions can be audited and revisited.
