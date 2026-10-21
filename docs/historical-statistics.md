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

The basic team stats tables also read PP% and PK% from the team summary
rows, matched by NHL team ID, season, and game type. Stored fractions display
as percentages; missing values display as an em dash.

Every row is unique by source identity, season, and game type. Regular season
uses NHL game type 2 and playoffs use type 3. Fields unavailable in an earlier
era remain `NULL`; they are never converted to zero.

Player profiles use these summaries for season histories and career totals.
The `/history` research workspace, its ranking queries, and charts are retired.
Player biography may be incomplete even where all-time season records exist.
Stored research-derived tables remain pending the database review.

The era-relative scoring index compares each skater's points with the number of
points expected if that player had produced at the league-wide points-per-game
rate in the same seasons. An index of 100 is league average for the player's
own season mix; 200 is twice that contemporary rate. The goalie Save Index
compares goals actually allowed with the number a league-average goalie would
have allowed on the same shots in the same seasons. A Save Index of 100 is
league average and higher is better. Only seasons with recorded saves and
shots against contribute to the goalie calculation. Both indexes provide era
context rather than claiming rules, deployment, ice time, and competition were
identical across eras.

General detailed-season selectors require rows in `team_season_stats`, while
the Games page uses seasons containing `games`. Team profiles also include
that team's scheduled seasons, and player profiles show their available career
seasons (including historical-only summaries) without a season selector.
This separation prevents all-time summary seasons from appearing in views that
need box scores or advanced data and allows future schedule seasons to appear
only where they are valid.

## Reusable descriptive calculations

Python owns the `historical-v1` definition in `analytics/history.py`.
`historical_peak_stats` stores complete three/five-season windows; `common_teams`
is the intersection of each season's source team abbreviations, so selecting a
team retains a window only when every season qualifies. Missing metric values
remain unavailable, and a gap in seasons invalidates the window.

`historical_era_rates` stores the full season/phase population's points per game
and covered goalie save rate. The former research queries aggregated selected player populations against
these stored denominators; those web consumers have been removed.
The published index formulas and goalie coverage exclusions are unchanged.

The historical importer updates these tables atomically with the source summary
range. `make analytics-build` rebuilds them from retained observations without
fetching sources. Rows retain definition version and ingestion-run lineage. These
are descriptive calculations over corrected history, not proof that an observation
was available at a past prediction cutoff. Modelling remains deferred.
