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

- `/lines` provides league-wide forward-line and pairing rankings in separate,
  URL-backed views so visitors do not have to scroll through both datasets.
- The season selector supports the full provider coverage range.
- Minimum five-on-five ice-time choices are 0, 50, 100, 200, and 300 minutes;
  100 minutes is the default.
- League tables show at most the top 100 qualifying combinations by xG%, with
  25, 50, and 100-row views, pagination, a visible result range, and sticky
  headings.
- Team pages show units with at least 50 minutes together.
- Every numeric column can be sorted immediately in the browser.
- Core, Possession, Shot Quality, and Results presets keep the wide rankings
  focused, while All Columns exposes the complete dataset.
- Metric headings explain themselves on hover or keyboard focus, the team or
  combination identity stays visible during horizontal scrolling, and each
  table links directly to the Metric Guide.
- Player and team names link to their detail pages.

The page credits MoneyPuck and presents unavailable pre-2008–09 coverage as
unavailable rather than zero.
