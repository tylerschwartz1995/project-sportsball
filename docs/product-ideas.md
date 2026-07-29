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
