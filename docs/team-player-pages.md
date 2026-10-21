# Team and player pages

The current feature inventory is maintained in [App scope](app-simplification.md).

## Routes and controls

- `/teams`: sortable basic season totals, alphabetical by default, with season
  and phase controls and an adjacent Advanced Stats tab.
- `/standings`: official regular-season standings; League, Conference, and
  Division views show one selected group at a time.
- `/teams/{id}`: Games, Players, Lines, Advanced Stats, with Games selected by default.
- `/players`: paginated basic statistics with name, player-type, and position
  controls, plus Advanced Stats. Filters apply automatically.
- `/players/{id}`: identity, compact biography, and a single season-history
  table with a phase switch and career-total footer.
- `/teams/{id}/games` and `/players/{id}/games`: retained selected-season game logs.

`/search` supports all-time player lookup from directory search results. The
former comparison page redirects into the current app. There
are no player comparison builders, profile trend charts, or card/table modes.

## Statistical grains

Team rosters use official team splits: a traded player's contribution stays
with the selected club. Player directory totals combine teams within a season
and phase. Player histories read the all-time NHL summary archive and add
normalized fallback rows only for missing season/phase/kind keys. Never add
overlapping historical and detailed totals twice.

Team identities join `team_seasons` for the requested season. Profiles include
schedule-only future seasons where available. Biography can be incomplete for
historical players even when their season records exist.

Game logs start from traditional appearances and left-join advanced metrics.
Missing MoneyPuck observations produce dashes, not zero or missing games.
Goalie appearance filters exclude dressed backups with no participation.
Rates use summed numerators and denominators, never averages of percentages.
Career totals require complete inputs for each displayed metric.

Directories, profiles, and JSON endpoints use the server-only PostgreSQL query
layer. No rendering request contacts an upstream sports provider. See
[Advanced analytics](advanced-analytics.md) for phase and source boundaries.
