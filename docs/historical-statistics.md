# All-time historical season statistics

The all-time layer stores official NHL Stats summary reports for skaters,
goalies, and teams from 1917–18 through 2025–26. It supplements rather than
replaces the detailed 2005–06+ game, box-score, play-by-play, standings, and
MoneyPuck tables.

Run the idempotent range ingestion with:

```bash
uv run --project pipeline --frozen sportsball \
  ingest-historical-seasons 19171918 20252026
```

The client requests each season and game type separately, follows the NHL
Stats service's 100-row pagination, throttles and retries requests, validates
the final row count, and retains one combined source payload and checksum per
report. Polars normalizes typed records before one transaction replaces the
requested season range. Minimal canonical player identities are added when a
historical player predates the detailed profile archive.

Normalized tables are:

- `historical_skater_season_stats`;
- `historical_goalie_season_stats`;
- `historical_team_season_stats`.

Every row is unique by source identity, season, and game type. Regular season
uses NHL game type 2 and playoffs use type 3. Fields unavailable in an earlier
era remain `NULL`; they are never converted to zero.

The `/history` record book reads these tables for a curated overview, career
and single-season rankings, rolling three- and five-season peaks, record
progression, scoring-environment context, decade leaders, and era-relative
career scoring. It supports skater, goalie, and team rankings; regular season
and playoffs; start/end season, minimum-games, position, team, and known birth
country filters; and view-specific total and rate ranking metrics. Rankings are
server-paginated in groups of 25 so every displayed rank and metric sort applies
to the complete filtered result set rather than a client-side subset.

Rate leaderboards use visible eligibility defaults to prevent short appearances
from dominating the results. Regular-season career points per game defaults to
500 games and single-season points per game to 40; career goalie save percentage
defaults to 250 games and single-season save percentage to 25; career team
points percentage defaults to 500 games and single-season points percentage to
40. Playoff qualifications are lower and appropriate to the shorter schedule.
Visitors can explicitly override every threshold.

Team and birth-country filters apply to player views. “Played For” identifies
seasons in which the player appeared for that team; the all-team NHL summary
cannot separate the player's totals within a multi-team season.

Historical player names link to `/players/{nhlPlayerId}`. Player profiles show
the complete regular-season and playoff summary archive, including seasons
before the detailed 2005–06 game-data boundary. Birth-country filtering is
available only for players whose separately ingested NHL profile provides that
field; leaving it at the default includes both known and unknown countries.

Skater points per game uses total points divided by total games in the selected
range. Goalie career save percentage uses total saves divided by total shots
against for seasons where those fields exist. Team career points percentage
uses total points divided by twice the games played. Team career totals currently
follow the NHL source team identity. Combining relocations and renames into
franchise lineages remains a documented future enhancement.

The era-relative scoring index compares each skater's points with the number of
points expected if that player had produced at the league-wide points-per-game
rate in the same seasons. An index of 100 is league average for the player's
own season mix; 200 is twice that contemporary rate. It provides scoring
context rather than claiming rules, deployment, ice time, and competition were
identical across eras.

The detailed-season selectors elsewhere deliberately require rows in
`team_season_stats`, while the Games page uses seasons containing `games`.
This separation prevents all-time summary seasons from appearing in views that
need box scores or advanced data and allows future schedule seasons to appear
only where they are valid.
