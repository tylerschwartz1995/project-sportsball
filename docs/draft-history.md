# Complete NHL draft history

## Source and coverage

Sportsball ingests the official NHL Records draft feed at
`https://records.nhl.com/site/api/draft`. The completed local backfill contains
13,152 selections across all 64 NHL drafts from 1963 through 2026. Every source
row remains part of the archive, including players who never appeared in the
NHL, rows without an NHL player ID, and 95 selections the source marks as
removed outright.

Run an inclusive, idempotent backfill with:

```bash
uv run --project pipeline --frozen sportsball \
  ingest-draft-history 1963 2026
```

The client fetches and validates a complete board one year at a time, retains
each decoded response in `source_payloads` under provider `nhl_records`, and
only replaces the requested years after every response has succeeded. An empty
or mixed-year board fails before normalized data is changed.

## Normalized archive

`draft_selections` stores the official record ID, year, date, round, pick in
round, overall pick, drafting team, player identity and biographical fields,
amateur league and club, and source removal flags. Canonical `players` and
`teams` links are nullable: old team IDs and selected players without an NHL
appearance remain valid draft facts even when no canonical dimension exists.
Exact NHL player-ID matches also enrich the existing player's draft fields.

Traded-pick identity is retained in two forms:

- `pick_owner_history` preserves the source string exactly, including modern
  chains such as `DET-STL-ANA` and legacy prose such as `DAL (from MIN)`;
- `original_pick_owner_abbrev` extracts the first owner for filtering and
  display while `drafting_team_abbrev` identifies the club that made the pick.

## Outcome definitions

The `/drafts` workspace joins selections to NHL-published all-time season
summaries rather than profile-only draft metadata. All outcome measures use
regular-season (`game_type = 2`) data:

- **NHL appearance:** at least one stored regular-season NHL game;
- **100-game player:** at least 100 stored regular-season NHL games;
- **GP per pick:** total regular-season games divided by every official
  selection, including zero-game selections;
- **value above expected:** average career games above or below selections from
  the same draft year and a similar overall-pick band;
- **late-round hit rate:** share of round-four-or-later selections with at
  least 100 games;
- **goalie hit rate:** share of drafted goalies with at least 50 NHL games;
- **Game Score per skater pick:** stored career MoneyPuck Game Score divided by
  all skater selections. A zero-game skater contributes zero, while a skater
  with NHL games but missing advanced coverage makes the team value
  unavailable rather than silently contributing zero.

The Player Outcomes chart also exposes stored MoneyPuck regular-season,
all-situations measures: career Game Score, individual expected goals, on-ice
expected-goal share, and goalie goals saved above expected. MoneyPuck player
coverage begins in 2008–09, so these measures describe the stored coverage
window rather than a guaranteed full career for older players. Selections
without matching advanced data are omitted from an advanced plot instead of
being treated as zero. On-ice expected-goal share is recomputed from stored
expected goals for and against; goalie GSAx is expected goals against minus
actual goals against.

The complete selection board is therefore the denominator for team and class
rates. The workspace separates four user tasks:

- **Draft Board** opens the latest official draft and provides year, team,
  round, and player search across the complete archive. Player and canonical
  team records link to their supporting profile pages.
- **Player Outcomes** opens the latest class with at least five seasons of
  observation. Newer classes remain selectable but are identified as still
  developing, and their totals are described as progress rather than final
  success rates.
- **Team Drafting** defaults to the ten most recent draft classes with at least
  five seasons of observation. It compares selection counts, NHL appearance
  and 100-game rates, games per pick, draft-position-adjusted value, late-round
  and goalie hit rates, and Game Score per skater pick across the same
  observation window. Each team’s linked selection list preserves that window
  so the underlying picks match the period used for the ranking. That
  drill-down stays on Team Drafting and opens a focused picks-and-outcomes
  modal with career totals plus advanced skater and goalie metrics. A labeled
  four-quadrant scatterplot positions team logos by 100-game rate and games per
  pick, with league-median crosshairs and exact values available on each crest.
- **Class Rankings** compares every mature draft class across NHL appearance,
  100-game and 500-game rates, games per pick, points per skater pick, and
  MoneyPuck Game Score per skater pick. Each metric sorts independently rather
  than being hidden inside a composite score. Classes with incomplete NHL
  skater Game Score coverage show that advanced metric as unavailable. A
  chronological, decade-separated outcome distribution shows the share of
  picks at four NHL career milestones with a shared scale and visible 100-game
  rate. Five relative-range heat bands follow the actively sorted metric so
  the comparison stays focused while every supporting value remains visible,
  without turning those metrics into one opaque grade.

The all-years board remains available with pagination. Its URL-backed sorting
is applied to the complete filtered result before pagination, rather than only
reordering the visible page.
