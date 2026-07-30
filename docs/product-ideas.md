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
4. Add natural-language interpretation that translates a question into the
   same validated structured query, showing the interpretation to the user.

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
