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

## Current presentation boundary

The player directory intentionally returns every stored participant so no
player is hidden behind an arbitrary cutoff. Search, sorting controls, and
pagination are the next website milestone and can be added without changing
the response contracts or statistical grains.
