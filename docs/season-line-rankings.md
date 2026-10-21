# Season line and pairing rankings

The website ranks regular-season five-on-five forward lines and defensive
pairings from 2008–09 onward.

## Derivation

MoneyPuck publishes one row per game, team, and unit. The Python pipeline uses
Polars to:

1. sort each unit's canonical player identifiers so source ordering cannot
   split the same combination;
2. group by season, team, unit type, and player set;
3. count games and sum ice time, expected goals, attempts, goals, shots, and
   high-danger expected goals;
4. recompute xG% and CF% from the summed for/against values.

The result is transactionally replaced in `moneypuck_unit_season_stats`.
Ingesting a new MoneyPuck line season refreshes its aggregates automatically.
The `build-moneypuck-unit-seasons` command rebuilds any historical range from
stored facts without another provider download. Rows record the
`unit-season-v1` derivation version.

## Website behavior

Team profiles show regular-season 5-on-5 lines and defensive pairings. The
query reads full-season aggregates for that team; controls choose unit type and
minimum TOI. Game detail has a separate Lines tab using game-level facts.
Numeric columns sort, names link to player profiles, and missing metrics stay
unavailable. See [App scope](app-simplification.md) for current columns.

Standalone league rankings and unit-detail pages have been retired; old URLs
redirect into the app. Historical line storage and aggregate builds remain.
