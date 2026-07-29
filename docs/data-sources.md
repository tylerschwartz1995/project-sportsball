# Data sources and coverage

## Decision

Use two independently replaceable source adapters:

1. NHL web endpoints for schedules, standings, teams, players, box scores,
   play-by-play, and traditional statistics.
2. MoneyPuck's published data downloads for advanced statistics.

Raw source responses will be retained separately from normalized database
records. This makes imports reproducible and limits the impact of upstream
schema changes.

## NHL data

The NHL website currently uses JSON endpoints under:

- `https://api-web.nhle.com/v1`
- `https://api.nhle.com/stats/rest`

Useful endpoint families verified during planning include:

- `/standings/now`
- `/schedule/{date}`
- `/club-schedule-season/{team}/{season}`
- `/club-stats/{team}/{season}/{game-type}`
- `/player/{player-id}/landing`
- `/gamecenter/{game-id}/boxscore`
- `/gamecenter/{game-id}/play-by-play`

Schedules, box scores, and play-by-play were verified for a 2005–06 game.
Early play-by-play is less detailed than modern data; for example, some events
do not include shot coordinates.

Play-by-play normalization and its resumable historical backfill are documented
in [Play-by-play ingestion](play-by-play.md).

Official dated standings are retained separately from Python-derived team
season aggregates. Historical final-snapshot behavior and team mapping are
documented in [Official NHL standings](official-standings.md).

These endpoints are not treated as a stable, supported public API. The
ingestion layer must therefore:

- throttle requests and use a descriptive user agent;
- cache immutable completed-game responses;
- retry transient failures with exponential backoff;
- validate every response before replacing normalized data;
- alert on schema changes;
- avoid NHL logos and other protected branding unless permission is obtained.

The NHL terms currently permit personal, non-commercial informational use but
also place significant restrictions on copying, publishing, database use, and
NHL intellectual property. Before making the site public, the intended display
and storage approach should receive a terms review:

https://www.nhl.com/info/terms-of-service

## Advanced analytics

MoneyPuck publishes downloadable datasets for non-commercial use and requires
clear attribution wherever its data is used. Only the files explicitly
provided on its download page should be fetched; the rest of the website must
not be scraped without approval.

Source and usage details:

- https://www.moneypuck.com/data.htm
- https://www.moneypuck.com/glossary.htm

Available data includes skater, goalie, line, team, game-level, and shot-level
records. Shot data includes expected goals and related model outputs.

## Coverage shown on the website

| Data category | Initial coverage |
| --- | --- |
| Schedules, results, and box scores | 2005–06 onward |
| Traditional team and player statistics | 2005–06 onward |
| Standings | 2005–06 onward, subject to endpoint validation |
| Play-by-play | 2005–06 onward, with fields varying by season |
| MoneyPuck advanced statistics | 2007–08 onward |

The interface must show the source and coverage range for each metric. Missing
advanced data in 2005–06 and 2006–07 must display as unavailable rather than
zero.

## Update policy

- Poll live-game data separately from the daily import in a later milestone.
- Run the regular daily import after the previous NHL game day has completed.
- Re-fetch recent completed games to pick up official scoring corrections.
- Treat older completed games as immutable unless a repair job is requested.
- Record source, source timestamp, fetched timestamp, checksum, and importer
  version for every raw payload.
