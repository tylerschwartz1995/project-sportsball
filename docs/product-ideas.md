# Product ideas

This is a living backlog for features that are valuable but not necessarily part
of the current delivery slice. Each idea should capture the user value, data
requirements, and a likely path to implementation before it becomes scheduled
work.

## 1. Historical query explorer

**Status:** Proposed

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

**Status:** Long-term

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

**Status:** Partially implemented

Season-level forward-line and defensive-pairing rankings are implemented with
season, team, minimum-ice-time, and sortable metric controls. Potential future
extensions include:

- rolling 10-, 20-, and 40-game combination results;
- home/away, tied/trailing/leading, and score-adjusted splits;
- teammate-network visualizations showing how frequently players skate
  together;
- comparison of a player's results across different linemates;
- cross-season leaderboards and franchise-history views;
- interactive drill-down from a season aggregate to its supporting games.

These should continue to use the canonical game-level unit facts and explicit
sample-size thresholds.

## 4. Additional modelling data

**Status:** Evaluate after daily automation

Potential additions include injuries, transactions, salary-cap and contract
data, projected lineups, and betting-market odds. Each source needs a licensing,
reliability, historical-coverage, and predictive-value review before ingestion.
Natural Stat Trick remains paused unless approved access or another compliant
acquisition method becomes available.

New sources should be added only when they improve a defined product feature or
model evaluation. The existing NHL and MoneyPuck history is sufficient for
baseline team, game, and player modelling.

## 5. Historical contracts and salary-cap analysis

**Status:** Proposed

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

**Status:** Proposed

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

## 7. Transactions explorer

**Status:** Proposed

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

**Status:** Proposed

Redesign the league homepage once the primary directories and visualizations
are mature. The current overview is useful as navigation but does not yet tell
a strong analytical story.

- Replace generic summary cards with information-rich league context.
- Prioritize live or latest results, the next scheduled games, standings
  movement, and meaningful statistical trends.
- Add compact plots only where they reveal change, distribution, or an unusual
  result that a single number cannot explain.
- Let visitors move directly from each insight to the supporting table, game,
  team, or player page.
- Keep the homepage sport-neutral enough to become the entry point for multiple
  leagues later without flattening sport-specific information.

## 9. Complete draft history and team drafting performance

**Status:** Partially implemented

The first Drafts page compares career outcomes for drafted players represented
in Sportsball's stored NHL player universe, including pick-position plots,
player outcomes, late-round value, and team production. This is useful for
players who reached the NHL, but it is not a complete draft-board archive.

The complete version should ingest every selection from each supported NHL
draft, including players who never appeared in the NHL. That additional
denominator is required before publishing true team hit rates or comparing
draft efficiency fairly.

Potential extensions include:

- a complete round-by-round board for every draft;
- NHL appearance, 100-game, and star-player hit rates by team and pick range;
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

**Status:** Initial version implemented; expanded filters and era adjustment remain proposed

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

The initial `/history` page now provides sortable career and best-season tables
for skaters, goalies, and source team identities, with regular-season/playoff
and ranking-metric controls. Coverage begins in 1917–18. Position, era,
nationality, rate, milestone, lineage, and era-adjusted views remain backlog.
