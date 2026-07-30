# Team and player pages

The core website exposes traditional season statistics through four
server-rendered routes:

- `/teams?season=20252026` lists every regular-season team;
- `/teams/12?season=20252026` shows one team's season and roster splits;
- `/players?season=20252026` lists every participating skater and goalie;
- `/players/8478402?season=20252026` shows a player profile and career history.

All pages query PostgreSQL directly from React Server Components. Matching JSON
endpoints under `/api/teams` and `/api/players` reuse the same typed query
functions for future consumers.

## Statistical grains

The team directory uses `team_season_stats`, whose grain is one team, season,
and NHL game type. Regular season and playoffs remain separate. Team detail
pages add the NHL-published rows from `official_skater_season_stats` and
`official_goalie_season_stats`. Those are team splits, so a traded player's
contribution to that particular club remains visible.

The player directory uses the Polars-derived `skater_season_stats` and
`goalie_season_stats`. Their grain is one player, season, and game type. A
traded player therefore has one combined total and a `teamsPlayedFor` count.
The player detail page displays those combined rows across the player's full
stored career.

This distinction is intentional:

```text
team page   -> player contribution to that team
player page -> player total across every team
```

Goalie indexes exclude dressed backups who did not participate. Save
percentage is derived from total saves and shots against, not an average of
game percentages.

## Historical identity

Team queries join `team_seasons` for the requested season. Relocations and
rebrands therefore use the name and abbreviation active at that time, while
the underlying NHL team and franchise identifiers remain stable for linking
and lineage analysis.

## Directory controls

Team and player directories support URL-based search, sorting, and pagination.
Filters use ordinary query parameters, so a filtered result can be bookmarked,
shared, and restored with browser navigation. Team pages show 16 results per
page. Player pages show 50 results per page and separate skater and goalie
views.

Every statistics table uses a shared client-side sorter. Column-heading buttons
reorder the visible rows immediately without a route transition; clicking the
active heading reverses its direction. This applies to standings, directories,
team rosters, player histories, box scores, and MoneyPuck tables. Small screens
use compact directory cards and retain explicit URL-based sort controls because
cards have no column headings. The underlying traditional-stat response
contracts and statistical grains are unchanged.

Team and player detail pages also show the available MoneyPuck season summaries.
See [Advanced analytics presentation](advanced-analytics.md) for the initial
metrics, source attribution, and coverage behavior.
