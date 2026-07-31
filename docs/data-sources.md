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

Implemented endpoint families include:

- `/standings/now`
- `/schedule/{date}`
- `/club-schedule-season/{team}/{season}`
- `/club-stats/{team}/{season}/{game-type}`
- `/player/{player-id}/landing`
- `/gamecenter/{game-id}/boxscore`
- `/gamecenter/{game-id}/play-by-play`

Schedules, box scores, play-by-play, profiles, and standings have been
backfilled across 2005–06 through 2025–26. Early play-by-play is less detailed
than modern data; for example, some events do not include shot coordinates.
The NHL Stats summary reports provide traditional skater, goalie, and team
season totals from 1917–18 through 2025–26. The published 2026–27 schedule is
also stored, including all future games through April 10, 2027.

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

The implemented adapter ingests every approved download needed for the initial
scope:

- skater, goalie, and team season summaries;
- team game-level records for regular season and playoffs;
- regular-season skater and goalie game records;
- regular-season and playoff shot records;
- regular-season five-on-five forward-line and defensive-pairing records.

Shot data includes expected goals and related model outputs. Exact downloaded
files are retained separately from normalized facts. Commands, storage, and
provider limitations are documented in
[MoneyPuck ingestion](moneypuck-season-ingestion.md).

## Coverage shown on the website

| Data category | Initial coverage |
| --- | --- |
| Schedule index | 2005–06 through the published 2026–27 schedule |
| Results, box scores, and detailed game statistics | 2005–06 onward as games are completed |
| Traditional team, skater, and goalie season summaries | 1917–18 onward |
| Standings | 2005–06 onward |
| Play-by-play | 2005–06 onward, with fields varying by season |
| MoneyPuck season-summary advanced statistics | 2008–09 onward |
| MoneyPuck team game advanced statistics | 2008–09 onward; regular season and playoffs |
| MoneyPuck player game advanced statistics | 2008–09 onward; regular season |
| MoneyPuck shot-level advanced statistics | 2007–08 onward |
| MoneyPuck line and pairing statistics | 2008–09 onward; regular-season five-on-five, game and Polars-derived season grains |

The interface must show the source and coverage range for each metric.
Unavailable provider coverage must display as unavailable rather than zero.
There is no MoneyPuck coverage in 2005–06 or 2006–07; 2007–08 has shot data
but not the other MoneyPuck datasets.

Detailed 2005–06+ database coverage is checked by
[the completeness audit](data-completeness-audit.md). On July 29, 2026, all
21 seasons passed with zero completeness errors.

## Update policy

- Poll live-game data separately from the daily import in a later milestone.
- Run the regular daily import after the previous NHL game day has completed.
- Re-fetch recent completed games to pick up official scoring corrections.
- Treat older completed games as immutable unless a repair job is requested.
- Record source, source timestamp, fetched timestamp, checksum, and importer
  version for every raw payload.
