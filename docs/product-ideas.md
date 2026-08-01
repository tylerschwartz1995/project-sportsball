# Product ideas

This is a living backlog for features that are valuable but not necessarily part
of the current delivery slice. Each idea should capture the user value, data
requirements, and a likely path to implementation before it becomes scheduled
work.

## Implementation status audit

Last checked against the repository on August 1, 2026.

| Idea | Current status | Implemented boundary |
| --- | --- | --- |
| Historical query explorer | Foundation available; explorer not implemented | Historical box scores, play-by-play, game logs, profiles, franchise identifiers, and deterministic read-only queries exist. There is no historical-query route, structured event/streak query layer, saved query, or conversational interface. |
| Multi-sport platform | Not started | Shared interface primitives exist, but the schema, ingestion clients, routes, terminology, and navigation remain NHL-specific. |
| Line-combination explorer | Expanded version implemented | Season and rolling 10-, 20-, and 40-team-game rankings support league/team scope, unit type, minimum ice time, sorting, and drill-down to supporting games. Situational splits, teammate networks, player/linemate comparison, and cross-season views remain. |
| Additional modelling data | Not implemented; deferred | No injury, transaction, contract, projected-lineup, or betting-market source is ingested. Source evaluation remains gated on production daily automation and a defined modelling use case. |
| Contracts and salary-cap analysis | Not implemented | There are no contract or cap models, migrations, ingestion clients, queries, or pages. |
| Strength of schedule | Expanded non-model version implemented | Team pages provide time-aware completed and remaining difficulty using points percentage, goal differential, and five-on-five expected-goal share, with supporting games, venue, rest, back-to-back, and estimated travel context. A governed model-based rating remains. |
| Transactions explorer | Not implemented | There are no transaction models, ingestion jobs, queries, or routes. |
| Homepage information redesign | Expanded redesign implemented | Results, upcoming games, standings, last-ten movement, latest-30 league trends, scoring leaders, advanced analytics, and archive destinations are live. Further insights can be added only when they reveal a distinct, evidence-linked pattern. |
| Complete draft history | Complete archive implemented | Every official NHL selection from 1963–2026 is stored, including non-NHL players, nullable source IDs, historical team codes, and traded-pick ownership. Draft boards and team NHL-appearance and 100-game rates use all 13,152 selections as the denominator. |
| Historical records and best seasons | Expanded traditional version implemented | Career and single-season skater, goalie, and team tables support phase, range, participation, position, team, birthplace, and total/rate filters. Era adjustment, milestones, age curves, multi-season peaks, franchise aggregation, and advanced historical rankings remain. |
| Saved comparisons and shareable plot state | Partially implemented | The dedicated player comparison restores season, phase, player type, and two-to-four selected players from its URL. Analytics plot controls, rolling-chart controls, named local saves, and copy-link actions are not persisted. |

## 1. Historical query explorer

**Status:** Foundation available; explorer not implemented

The repository already provides the main source facts and supporting detail
experiences: complete stored box scores and play-by-play from 2005–06 onward,
game logs, player and team profiles, franchise identifiers, metric definitions,
and typed read-only application queries. No `/explore` or equivalent route,
structured event/streak query contract, derived event index, saved-query
storage, natural-language interpretation, or conversational interface exists.

Let a visitor query historical NHL events, statistics, streaks, and outliers in
plain language or with structured filters. The result should answer questions
such as:

- When was the last time a goalie made at least 50 saves?
- When was the last time a team won after trailing by three goals?
- Which players recorded five or more points in one game since 2005?
- What are the most unusual shooting-percentage games in a selected season?
- How often has a particular event occurred, and in which games?

### Product behavior

- Return the answer, matching games or players, and the applied definition.
- Link every result to its supporting game, box score, and event timeline.
- Support team, player, season, date, game type, and home/away filters.
- Make franchise-lineage behavior explicit: users can search either one
  historical team identity or the full franchise history.
- Allow results to be sorted by recency, frequency, or statistical extremity.
- Save and share useful queries.

### Conversational experience

Present the explorer as an embedded "Ask Sportsball" experience rather than a
separate generic chatbot. It should be available throughout the site and use
the current page as context. A visitor on a player, team, or game page could ask
questions such as:

- Compare this player's last three seasons.
- Show this team's worst defensive performances this season.
- Why do the expected-goal totals favor one team in this game?
- Find every playoff game since 2015 in which a team overcame a three-goal
  deficit.

Answers should be interactive results, not only generated prose. Depending on
the question, a response may contain:

- visible filter chips that the visitor can adjust;
- sortable tables and player or team comparison cards;
- charts, shot maps, or other existing Sportsball visualizations;
- links to the supporting games, box scores, players, and teams;
- suggested follow-up questions;
- a shareable URL that preserves the interpreted query.

Follow-up messages such as "only playoffs", "compare home and away", or "sort
by expected goals" should refine the current structured query. The interface
must show that interpretation so the visitor can verify and correct it.

### AI orchestration

An LLM application framework such as LangChain is a candidate for the
conversational layer. It could provide schema-validated output, page-aware
context, tool selection, multi-step query refinement, and tracing. This is an
implementation option to evaluate, not a required dependency for the core
application.

The model should call a small set of typed, read-only Sportsball tools, such as
player search, season comparison, game search, statistical-extreme lookup,
game analysis, metric definitions, and shot-data retrieval. Each tool should
delegate to deterministic application queries and return stable contracts.
The model must not receive unrestricted SQL execution or become responsible
for calculating official statistics.

The intended request path is:

```text
natural-language question
    -> validated structured query
    -> deterministic Sportsball query functions
    -> PostgreSQL or query-optimized derived tables
    -> evidence-backed interactive result and concise explanation
```

Start with a direct model API and schema validation if that is sufficient for
the first narrow slice. Adopt LangChain when multiple tools, correction loops,
provider portability, or richer tracing provide a demonstrated benefit.
LangGraph-style durable orchestration is unnecessary unless the feature grows
into a genuinely long-running or stateful workflow.

### Data and engineering requirements

- Complete box scores and play-by-play events from 2005 onward.
- Season-specific team identities and stable franchise lineage.
- A governed metric/event dictionary so phrases such as "comeback" and
  "high-danger chance" have clear, testable definitions.
- Python/Polars feature jobs for streaks, game state, rolling context, and
  outlier scores.
- Query-optimized database tables or materialized views for common searches.
- Data-quality checks that reconcile derived answers with source games.

### Suggested delivery path

1. Build structured filters and a small library of validated query templates.
2. Add derived event and streak tables plus outlier-ranking features.
3. Add saved queries and shareable result URLs.
4. Add contextual questions to player, team, and game pages.
5. Add natural-language interpretation that translates a question into the
   same validated structured query, showing the interpretation to the user.
6. Add conversational refinement, interactive result components, and
   evaluation coverage for representative questions.

Natural-language querying should sit on top of the structured query system, not
replace it. That keeps results reproducible and makes it possible to explain
exactly why a game matched.

## 2. Multi-sport platform

**Status:** Long-term; not started

The current product remains NHL-only. Some visual and workspace primitives are
sport-neutral, but database entities, source clients, statistics contracts,
routes, labels, and navigation do not yet carry explicit sport and league
dimensions. No second-sport ingestion or user-facing selector is implemented.

Expand Sportsball beyond hockey so one site can eventually support multiple
sports and leagues without making every experience look or behave like NHL
statistics.

### Product behavior

- Add a clear sport and league selector when a second sport is introduced.
- Keep shared navigation, search, dates, teams, players, games, and standings
  patterns consistent where the underlying concepts truly match.
- Give each sport its own terminology, table columns, metric definitions,
  visualizations, season structure, and game-detail experience.
- Preserve sport and league context in every shareable URL.

### Architecture implications

- Keep shared interface components neutral where practical, while allowing
  sport-specific pages and data contracts instead of one oversized universal
  schema.
- Add explicit sport and league dimensions before ingesting a second sport.
- Namespace source integrations, normalization rules, metrics, and predictive
  models by sport and provider.
- Avoid coupling the global shell and design system to NHL-specific labels or
  imagery.

The current NHL implementation remains the proving ground. We should not
generalize ingestion or database tables prematurely; the second sport will
provide the concrete requirements needed to extract the correct shared
abstractions.

## 3. Line-combination explorer

**Status:** Expanded version implemented

Forward-line and defensive-pairing rankings are implemented with season,
league/team, minimum-ice-time, and sortable metric controls. Visitors can use
full-season results or rolling samples covering each team's latest 10, 20, or
40 regular-season games. Every combination links to its supporting game log,
including opponent, venue, score, usage, expected-goal, possession, goal, and
shot results. Percentages are recomputed from the totals in the selected
window.

Potential future extensions include:

- home/away, tied/trailing/leading, and score-adjusted splits;
- teammate-network visualizations showing how frequently players skate
  together;
- comparison of a player's results across different linemates;
- cross-season leaderboards and franchise-history views;
- direct comparison of multiple combinations in one view.

These should continue to use the canonical game-level unit facts and explicit
sample-size thresholds.

## 4. Additional modelling data

**Status:** Not implemented; evaluate after production daily automation

The ingestion package currently contains NHL and MoneyPuck clients only. It has
no injury, transaction, contract, salary-cap, projected-lineup, or betting-odds
models, migrations, ingestion commands, or stored datasets. The local audited
daily coordinator is implemented, but scheduled production operation is still
deferred.

Potential additions include injuries, transactions, salary-cap and contract
data, projected lineups, and betting-market odds. Each source needs a licensing,
reliability, historical-coverage, and predictive-value review before ingestion.
Natural Stat Trick remains paused unless approved access or another compliant
acquisition method becomes available.

New sources should be added only when they improve a defined product feature or
model evaluation. The existing NHL and MoneyPuck history is sufficient for
baseline team, game, and player modelling.

## 5. Historical contracts and salary-cap analysis

**Status:** Not implemented; proposed

No contract or salary-cap schema, migration, source client, ingestion job,
query contract, or user-facing view is implemented. Player-profile draft and
biographical fields should not be mistaken for contract history.

Add current and historical player contract information so team and player pages
can explain performance in the context of roster cost. The product should
support cap hit, annual salary, contract term, signing status, expiry type,
retained salary, buyouts, injured-reserve treatment, and team-level cap
commitments where reliable source coverage permits.

Potential product features include:

- contract history and remaining term on player profiles;
- current and historical cap tables on team profiles;
- cost per goal, point, win, and goals saved above expected;
- surplus-value estimates that compare performance with cap hit;
- expiring-contract and future-cap-commitment views;
- trade-deadline and roster-construction analysis.

Before ingestion, evaluate source licensing, historical completeness, handling
of two-way contracts and performance bonuses, and the NHL CBA rules needed to
reproduce team cap positions accurately. Contract facts should be stored with
effective dates so historical pages never display a player's current contract
as if it applied to an earlier season.

## 6. Strength of schedule

**Status:** Expanded non-model version implemented

Add both forward-looking and backward-looking schedule difficulty to team
profiles.

- Upcoming strength of schedule should summarize the quality of remaining
  opponents, home/away mix, travel, rest, and back-to-back games.
- Completed strength of schedule should show the quality of opponents already
  faced and help contextualize the team's record and underlying performance.
- Methodology must be time-aware: opponent strength should use only information
  available at the date being evaluated, particularly when the feature is used
  for predictive modelling.
- Let visitors inspect the supporting games and switch between standings-based,
  goal-differential, expected-goal, and model-based definitions.

Team profiles now include completed and remaining regular-season schedule
difficulty with standings-based, goal-differential, and five-on-five
expected-goal definitions. Each opponent rating uses only games played before
the matchup, and the supporting schedule exposes home/away mix, rest days, and
back-to-backs. The schedule also estimates great-circle travel between
consecutive home markets, including completed and remaining totals plus each
supporting leg. The NHL schedule archive does not retain venue coordinates, so
neutral-site games and historical arena changes remain documented estimates.
A model-based definition remains future work until a governed prediction model
is available.

## 7. Transactions explorer

**Status:** Not implemented; proposed

No transaction schema, migration, source client, ingestion command, query, or
route is implemented. Player-team associations in game and season statistics
describe participation, not roster-move history, and cannot power this feature.

Add a dedicated transactions page covering trades, signings, waivers, recalls,
assignments, injured-reserve moves, retirements, and other roster changes.

- Filter by date, season, team, player, and transaction type.
- Link every transaction to the affected player and team profiles.
- Preserve the team identity and contract context that applied on the
  transaction date.
- Add a readable trade view that groups every asset in a multi-team deal,
  including draft picks, retained salary, and conditional terms when available.
- Support historical team timelines and player-movement histories.
- Evaluate source licensing and completeness before ingestion, especially for
  older roster moves and conditional trade details.

## 8. Homepage information redesign

**Status:** Expanded redesign implemented

The local MVP homepage now prioritizes latest results, upcoming games,
standings, scoring leaders, advanced analytics, and direct archive navigation.
It uses dense lists and tables rather than low-information summary cards. A
standings-movement panel shows the current top six teams' exact point outcomes
over their last 10 games and compares that segment with the preceding 10. A
league-trends panel compares the latest 30 completed games with the prior 30
for scoring, home wins, one-goal results, and extra-time frequency, and links
to the supporting results and highest-scoring game.

Potential post-MVP extensions include:

- Add compact plots only where they reveal change, distribution, or an unusual
  result that a single number cannot explain.
- Let visitors move directly from each insight to the supporting table, game,
  team, or player page.
- Keep the homepage sport-neutral enough to become the entry point for multiple
  leagues later without flattening sport-specific information.

## 9. Complete draft history and team drafting performance

**Status:** Complete archive implemented; advanced modeling remains proposed

The Drafts workspace now covers all 13,152 official NHL selections across the
64 drafts from 1963 through 2026. The archive retains players who never appeared
in the NHL, nullable NHL player links, selections marked removed outright,
historical drafting-team codes, and exact traded-pick ownership chains. Each
year provides a complete round-by-round board, while an explicit all-years view
pages through the full archive.

Career outcomes join to NHL-published all-time regular-season summaries.
Organizational tables publish NHL-appearance and 100-game rates using every
selection as the denominator, plus games per selection, total games, skater
points, goalie wins, and late-round regulars. The latest draft with a stored NHL
outcome is the default analysis view; future and newly completed drafts remain
selectable even when their current outcome is zero.

Potential extensions include:

- star-player hit rates by team and pick range with a governed definition;
- era- and opportunity-adjusted value above expected draft position;
- comparisons between drafting teams, general managers, and scouting eras;
- re-drafts using realized career outcomes;
- country, league, position, and age patterns;
- time-to-debut, peak value, career longevity, awards, and playoff outcomes;
- team pages showing the best and worst draft classes in franchise history.

Historical team identities and traded draft picks should be preserved so the
page can distinguish the club that made the selection from the franchise that
originally owned the pick.

## 10. Historical records and best seasons

**Status:** Expanded traditional version implemented; era adjustment remains proposed

Add a dedicated historical records page for browsing the strongest careers,
single seasons, teams, and performances across the stored NHL archive.

- Show all-time totals and rates for skaters, goalies, and teams.
- Rank the best individual and team seasons by traditional and advanced
  metrics.
- Support regular-season/playoff, position, era, team, nationality, and
  minimum-playing-time filters.
- Separate raw historical records from era-adjusted comparisons so visitors
  can understand both what happened and how unusual it was for the period.
- Highlight peaks, longevity, records, milestones, age curves, and the best
  multi-season stretches.
- Link every result to its supporting season, player, team, games, and metric
  definition.

This should complement the historical query explorer. The records page is a
curated, browsable statistical product; the query explorer answers narrower,
open-ended questions.

The `/history` page now provides sortable career and best-season tables for
skaters, goalies, and source team identities, with regular-season/playoff,
season-range, minimum-games, position, team, known birth-country, and total/rate
metric controls. Coverage begins in 1917–18, and player rows link to complete
all-time profile tables. True nationality enrichment, milestones, franchise
lineage, and era-adjusted views remain backlog.

## 11. Saved comparisons and shareable plot state

**Status:** Partially implemented

The dedicated `/players/compare` workflow already encodes and restores season,
regular-season/playoff phase, skater/goalie type, and two-to-four selected
players in the URL. Those comparison links can be shared directly. The broader
analytics scatterplots and rolling-performance charts still keep their metric,
group, venue, and rolling-window controls only in client state. There is no
copy-link action, named local collection, or server-side saved comparison.

Let visitors preserve a useful player or team comparison and share the exact
plot configuration with another person.

- Encode selected subjects, metrics, season, phase, situation, rolling window,
  and applicable filters in a stable URL.
- Allow named comparisons to be saved locally before deciding whether accounts
  and server-side persistence are valuable.
- Restore the same visible table, chart, and explanatory context when a shared
  URL is opened.
- Keep URLs backward compatible when metric labels or interface organization
  change.
