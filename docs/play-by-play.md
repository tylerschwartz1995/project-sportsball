# Play-by-play ingestion

Play-by-play records the ordered events that make up a game. The pipeline retains the
complete NHL response in `source_payloads`, then creates queryable `game_events` and
`game_event_players` records.

## Commands

Ingest one stored final game:

```bash
uv run --project pipeline sportsball ingest-game-play-by-play 2025020001
```

Resume an inclusive historical range:

```bash
uv run --project pipeline sportsball backfill-game-play-by-play 20052006 20252026
```

Use `--max-games` for a bounded test or batch. Known failures are parked so later games
can continue; use `--retry-failed` after diagnosing or correcting them. Progress is
printed every 100 attempts and immediately for failures.

## Event facts

Each `game_events` row stores:

- source event ID and chronological sort order;
- period number and type;
- elapsed and remaining period time as integer seconds;
- event type and optional situation code;
- event-owning team;
- optional rink coordinates, zone, and shot type;
- optional penalty classification and duration;
- score and shot totals when supplied with the event.

The complete event-specific source details remain recoverable from the retained raw
payload. Normalized rows intentionally avoid duplicating video URLs and other presentation
fields that are not required for statistical queries.

## Player roles

`game_event_players` associates a canonical player with a semantic event role. Supported
roles include scorer, primary and secondary assister, shooter, goalie in net, blocker,
hitter, hittee, faceoff winner and loser, and players who committed or drew a penalty.

## Historical coverage

The NHL feed is much sparser in the earliest seasons. A representative 2005–06 game
contains goals, penalties, and shots but no event coordinates. Modern games include a
broader event timeline, situation codes, and rink locations. Missing historical fields
remain `null`; they are never converted to zero or inferred.

The backfill is idempotent. A successful refresh replaces one game's normalized event
snapshot in a transaction, while raw responses remain checksum-versioned for provenance.
