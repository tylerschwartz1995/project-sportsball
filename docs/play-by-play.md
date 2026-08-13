# Play-by-play ingestion

Play-by-play records the ordered events that make up a game. The pipeline retains the
complete NHL response in `source_payloads`, then creates queryable `game_events` and
`game_event_players` records.

## Commands

Ingest one stored final game:

```bash
uv run --project pipeline --frozen sportsball \
  ingest-game-play-by-play 2025020001
```

Resume an inclusive historical range:

```bash
uv run --project pipeline --frozen sportsball \
  backfill-game-play-by-play 20052006 20252026
```

Use `--max-games` for a bounded test or batch. Known failures are parked so later games
can continue; use `--retry-failed` after diagnosing or correcting them. Progress is
printed every 100 attempts and immediately for failures.

## Event facts

Each `game_events` row stores:

- source event ID and chronological sort order;
- period number and type;
- exact source clock strings plus parsed integer seconds when valid;
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

Every role retains the provider's player ID. The canonical player foreign key is nullable
because a small number of historical feeds reference an ID absent from both the game
roster and NHL player endpoint. Those references remain queryable without creating a
fictional player record.

## Historical coverage

The NHL feed is much sparser in the earliest seasons. A representative 2005–06 game
contains goals, penalties, and shots but no event coordinates. Modern games include a
broader event timeline, situation codes, and rink locations. Missing historical fields
remain `null`; they are never converted to zero or inferred.

Malformed historical clocks are preserved exactly in their raw clock columns. Their
parsed-seconds columns remain `null`, allowing event order to fall back to the authoritative
source sort order without inventing a time.

The backfill is idempotent. A successful refresh replaces one game's normalized event
snapshot in a transaction, while raw responses remain checksum-versioned for provenance.

## Website presentation

Completed game pages read `game_events` and `game_event_players` through the
server-only `getGamePlayByPlay()` query. Its two parameterized reads run in
parallel, preserve the NHL chronological sort order, attach historical team
identity, and group each participant beneath the event with their semantic
role.

The page presents:

- an always-visible scoring summary with period, time, team, scorer, assists,
  strength, shot type, and running score;
- a compact section for every period that loads that period's complete event
  list through URL-backed navigation, keeping closed periods out of the
  initial document while preserving shareable state;
- readable event descriptions for goals, penalties, shots, blocks, hits,
  faceoffs, possession changes, stoppages, and period boundaries;
- links from canonical players and teams to their supporting profiles;
- unresolved historical player references as visible NHL source identifiers
  rather than invented identities.

Goals and penalties receive stronger visual emphasis within the full timeline.
Historical nulls remain visible as unavailable details; the presentation does
not infer coordinates, clocks, or players that are absent from the source.
