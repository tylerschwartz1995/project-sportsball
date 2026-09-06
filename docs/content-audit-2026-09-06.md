> This is the pre-change audit baseline. See [implementation decisions](content-audit-implementation.md) for the merged changes and validation, and [usability refinements](usability-audit-implementation.md) for later behavior. Findings below describe the baseline, not unresolved current defects.

# Sportsball content audit

Audit date: September 5, 2026 (Pacific time)
Repository baseline: `main`, `3f91fe6` — “Refine Sportsball visual design, sizing, and theme contrast” (#142).
Scope: content, information hierarchy, usefulness, duplication, controls, explanation, and content-related trust. Read-only review of the application; no implementation changes.

## Overall judgment

Sportsball has enough useful information to support a focused statistics app. Its main problem is that too many surfaces explain themselves, repeat adjacent information, or expose a specialist investigation before answering the basic question.

**Keep the breadth available; substantially reduce what appears by default.** Start with subtraction and reordering. Do not delete historical data or entire useful destinations simply because their current presentation is heavy.

Working assumption: the primary experience is following NHL results, finding teams and players, and understanding performance. Detailed research is a deliberate next step. This is an audit assumption based on the existing app and Tyler’s stated ethos, not a proposal to abandon historical or advanced analysis.

The highest-value changes are:

1. Remove the homepage’s duplicate Recent Form panel and default League Trends block.
2. Make team and player overviews answer basic performance questions before specialist breakdowns or biography.
3. Remove repeated advanced-stat cards, generic filter instructions, repeated metric glossaries, and controls that do not affect the current content.
4. Put rankings and comparison tables before optional charts, explanatory panels, and empty comparison builders.
5. Treat scheduled games as scheduled games, rather than as missing completed-game analytics.
6. Fix content-trust gaps before removing their warning signs: historical profiles, incomplete “career” claims, ranking population limits, and dressed-but-unused goalies.

These are editorial judgments supported by inspection, not measured claims about user behavior. No usage analytics or user-interview evidence was available in this task.

## How decisions were made

For every surface, ask:

- What question does this answer?
- Does it add something the immediately surrounding content does not?
- Is this the right place and moment for that answer?
- Does the user need a choice here, or would one sensible default suffice?
- Could a shorter label, optional detail, or link preserve the value?
- Would removing it make a statistic misleading or a task harder?

**Keep** means retain in the main experience. **Simplify** means shorten or combine without changing the statistic. **Move** means retain behind a tab, disclosure, preset, or contextual action. **Remove** means remove the presentation, not the stored data. **Correct** means the present wording or behavior can mislead; this is not a cosmetic cut. **Defer** means stop promoting a specialist feature until its benefit and interpretation justify the complexity.

## Coverage and evidence

All 18 page templates were inventoried in source and visited in the local app. The review included their content-bearing shared components, table fields and presets, explanatory copy, loading/empty/error branches, chart labels, accessible alternatives, navigation, and supporting query boundaries where they affect meaning.

| Template | Content examined |
| --- | --- |
| `/` | Results, upcoming games, standings, Recent Form, leaders, League Trends, analytics promotion, Explore More |
| `/standings` | Overall/conference/division tables, points progression, grouping controls, snapshot and clinch legend |
| `/games` | Season/phase/team/date controls, calendar/week/day navigation, completed and scheduled cards, no-schedule state |
| `/games/[id]` | Score header, scoring summary, Game Flow, timeline, both teams’ skater/goalie box scores, four advanced subviews, upcoming state |
| `/teams` | Conference/division directory, identity and counts |
| `/teams/[id]` | Overview, Schedule, Strength, Trends, Skaters, Goalies, Advanced, Combinations |
| `/teams/[id]/games` | Last-ten strip, complete game log, traditional and five-on-five fields |
| `/players` | Skater/goalie directories, primary and optional filters, desktop tables, mobile-card source, pagination |
| `/players/[id]` | Skater/goalie overview, biography, trends, advanced situations, season history, historical-only profile |
| `/players/[id]/games` | Skater/goalie logs, recent strips, advanced fields, dressed-backup rows |
| `/players/compare` | Empty/selected lineup, two-to-four-player workflow, default chart, complete comparison |
| `/playoffs` | Bracket, scorer and goalie tables, series Overview/Games/Player Stats/Advanced dialog; projected branch in source |
| `/analytics` | Team/skater/goalie tables and presets, situations, qualification, relationship plots, distributions, direct comparisons |
| `/analytics/guide` | All definition groups, interpretation guidance, links and season selector |
| `/lines` | Forward lines, pairings, full-season/rolling sample controls, minimum TOI, presets and pagination |
| `/lines/[unit]` | Player identities, team context, supporting game table |
| `/drafts` | Board, Player Outcomes, Team Drafting, Class Rankings; pick-outcome drill-down source |
| `/history` | Record Book, Careers, Single Seasons, Peaks, Era Adjusted; skater/goalie/team variants and definitions |

Browser examples included Colorado, McDavid, Andersen, Gretzky, a completed regular-season game, the stored Stanley Cup Final, an upcoming game, and one forward-line detail. All four playoff-series tabs were opened. Dark-theme desktop screenshots were inspected at the actual 1280 × 720 viewport.

Limits: this is a comprehensive template-level content audit, not an assertion that every player, historical season, filter combination, or browser has been exercised. A requested mobile viewport override did not take effect—the observed viewport remained 1280 × 720—so responsive content was reviewed in source but a new mobile visual pass is not claimed. Light-mode appearance, assistive-technology behavior, data reconciliation, performance and CI were not retested. The earlier engineering audit is background evidence, not a substitute for this review. No source refresh, deployment, database mutation, commit, or PR was performed.

## 1. Shared shell, navigation and explanatory copy

Evidence: [site header](../apps/web/src/components/shell/site-header.tsx), [page/panel headers](../apps/web/src/components/ui/workspace-primitives.tsx), [filter primitives](../apps/web/src/components/ui/filter-primitives.tsx), [view tabs](../apps/web/src/components/ui/view-tabs.tsx), [layout/footer](../apps/web/src/app/layout.tsx).

| ID | Content | Decision and reason |
| --- | --- | --- |
| S1 | Nine primary destinations | **Keep for now.** They are distinct existing tasks. There is insufficient evidence to bury History or Drafts or redesign navigation as part of a pruning pass. Do not add a second directory of the same destinations on every page. |
| S2 | NHL beside the brand | **Keep.** It establishes the sport; this is not a nonfunctional sport picker. |
| S3 | Eyebrow + title + description + panel title | **Simplify.** Keep the title and genuinely necessary context. “Player statistics” above “Players,” “Advanced analytics” above “Player Advanced Analytics,” and similar repetitions do not each need a line. |
| S4 | Labels such as “Profile view,” “Game view,” “Advanced view,” “Content” | **Remove visually where the tabs already explain themselves.** Preserve accessible navigation names and distinct styling for view tabs versus phase controls. Keep a visible label only where two adjacent control groups would otherwise be ambiguous. |
| S5 | “Filters,” “No extra filters,” “Optional,” generic instructions, disabled Clear Filters | **Simplify.** Labeled inputs and an Apply action are usually sufficient. Show a clear action when there is something to clear. Show active-filter information when useful, not a permanent announcement of zero filters. |
| S6 | Auto-update versus Apply behavior | **Keep the distinction understandable.** Do not remove the only explanation while behavior differs by page. Prefer consistent behavior later; this audit does not assume all controls already auto-apply. |
| S7 | Repeated generic metric paragraphs | **Remove repeated blocks; keep local definitions.** A goalie page does not need a paragraph explaining Corsi and Fenwick. Keep attribution, hover/focus definitions, and a contextual Metric Guide link. |
| S8 | Source and coverage disclosures | **Keep.** Shorten implementation language, not meaning. Phase, situation, workload, incomplete coverage, and what “career” means can change the conclusion. These are not expendable decoration. |
| S9 | Entity names, logos, abbreviations | **Keep identity; remove redundant second labels selectively.** A full team name plus its abbreviation often repeats itself. Abbreviations remain useful in dense scoreboards and charts. Do not remove accessible logo alternatives because a DOM snapshot lists them twice. |
| S10 | Numeric sorting, pagination, row range, active selections | **Keep.** These support actual work. Sorting indicators can replace prose telling users to click a header. Row ranges belong with the results, not in several panels. |
| S11 | Screen-reader chart tables and chart instructions | **Keep accessible alternatives.** They are not duplicate visible content. Move lengthy usage directions into accessible help; keep essential touch and keyboard discoverability. |
| S12 | Footer | **Keep compact attribution and guide access.** Change the internal guide’s ↗ to an ordinary internal-link treatment; the current icon suggests leaving the app. Repeating the brand here is low priority, not a major problem. |

## 2. Homepage

Evidence: [homepage](../apps/web/src/app/page.tsx), [insight components](../apps/web/src/features/league/homepage-insights.tsx), [insight calculations](../apps/web/src/lib/homepage-insights.ts).

| ID | Content | Decision and reason |
| --- | --- | --- |
| H1 | Latest results, matchup, score, final/OT status, date | **Keep.** This is the main reason to visit. A short list is appropriate here; the full schedule is one click away. |
| H2 | Upcoming games | **Keep, clarify scope.** It intentionally shows current upcoming games independently of the selected historical season. Label the block with its season, especially when browsing an archive. Retain time-zone information. |
| H3 | Top-six standings | **Keep as a compact snapshot.** Use one scope label, such as “Regular Season · Top 6,” and label points clearly. Do not add standings charts here. |
| H4 | Recent Form | **Remove from the default homepage.** It repeats the exact six standings leaders, their ranks and season points, then adds last-ten points and change from the prior ten. It is not a league-wide discovery of who has improved most. Team Trends is a better home for this investigation. |
| H5 | “Points History” action | **Correct if retained anywhere.** It currently links to the standings default table, not `display=progress`. An action label should describe the destination actually opened. |
| H6 | League Trends: goals/game, home win rate, one-goal rate, extra-time rate | **Remove from the default homepage.** Fixed latest-30 versus previous-30 comparisons surface fluctuations without a reason to believe they matter. “All Results” does not reproduce that analytical sample. Do not replace this with automatically generated narratives about every change. |
| H7 | Highest-scoring game in that sample | **Remove with the trends block.** It is a defensible fact but a weak permanent selection rule. A genuinely notable game can later earn a contextual feature. |
| H8 | Scoring leaders | **Keep.** Player name, team, points and GP earn their place. Position and explicit # rank are optional secondary detail. Label the phase because recent results may be playoffs while the leaders are regular-season totals. |
| H9 | Advanced Analytics promotional strip | **Remove.** The primary navigation already offers Analytics. The list of acronyms is a feature inventory, not an answer. |
| H10 | Explore More cards | **Remove the repeated archive directory.** History, Playoffs and Drafts are already in navigation; Compare Players is available from Players. If discovery proves difficult later, use a compact link, not four promotional cards. |
| H11 | “Recent,” “final snapshot,” selected season | **Correct/clarify.** In the inspected local state, results ended in June and League Trends used April games. Historical content should have explicit dates instead of appearing current by implication. “Final” must depend on actual season state, not a hard-coded title. |
| H12 | Entire dashboard gated on a standings leader | **Correct.** The source withholds otherwise useful blocks when standings are absent. A missing standings snapshot should not suppress available schedules or scores. |

Proposed homepage: one title and season control; latest results; clearly labeled upcoming games; compact standings; compact scoring leaders. No filler block is required to make the page look full.

## 3. Standings

Evidence: [standings page](../apps/web/src/app/standings/page.tsx), [progression chart](../apps/web/src/features/standings/standings-points-chart.tsx).

- **Keep** overall, conference and division groupings; team identity; GP, W, L, OT, PTS and clinch information. These answer where a team stands.
- **Keep secondary** RW, GF, GA and DIFF. RW explains a tiebreak; goal differential gives performance context. These are reasonable in a dedicated standings table, even if a compact default later hides GF/GA.
- **Keep** Points Progression as an intentional alternate view. It adds change over time rather than redrawing current standings.
- **Remove/correct** overall/conference/division grouping controls while Points Progression is active. The chart uses its own division selector; those outer controls do not change the plotted division.
- **Simplify** “Standings Tables” to “Standings,” and remove “Select any column heading to sort the current table.”
- **Consolidate** snapshot date, source and the p/z/y/x/e legend once per page, rather than once per conference/division table. Explain only markers that can appear, or provide the complete legend on demand.
- **Correct** the unconditional “Final Standings” title. Use “Standings” for a season still in progress; preserve the snapshot date so stored data is not mistaken for live data.

## 4. Schedule and game previews

Evidence: [schedule](../apps/web/src/app/games/page.tsx), [calendar controls](../apps/web/src/features/games/game-picker.tsx), [game page](../apps/web/src/app/games/[id]/page.tsx).

- **Keep** season, phase, team and date; the week strip; calendar access; clear final/OT status; linked teams; local start time for scheduled games.
- **Simplify** the page description. “Using the team name active in that season” is a data convention, not a necessary introduction on every visit.
- **Simplify** calendar/week/day navigation only after preserving both browsing and direct date access. Keep week navigation plus date selection; previous/next day buttons are lower-value when the same seven days are already selectable.
- **Remove** repeated “Regular season” from every card when the page is already phase-filtered. Keep exceptional status and OT/SO distinctions.
- **Remove** “Shots unavailable” from games that have not started. Ten copies appeared on the inspected five-game date. Missing shots in a completed game are a different state and still need an honest indicator.
- **Demote** the original start time on completed result cards. The final score is the answer; start time matters more for upcoming games.
- **Keep** completed-game shot totals if they fit compactly. Do not discard them solely because the game detail also has them—the result card has its own useful summary role.
- **Correct** the upcoming game detail. The inspected `/games/2026020001` shows “MoneyPuck game data unavailable,” blank score placeholders, “Shots unavailable,” and an empty “Game view” label. Replace that analytical empty state with a scheduled-game presentation: teams, date/time, status and a brief statement that results appear after play.
- **Demote/remove** 0–0–0 team records before a season begins unless the context makes them useful. Avoid presenting placeholder zeros as analysis.
- **Correct** the no-schedule branch: retain season/phase navigation when no dates exist. The source puts the controls inside the successful-data branch, leaving an empty selection without an obvious way to change it.

## 5. Completed game detail

Evidence: [game page](../apps/web/src/app/games/[id]/page.tsx), [scoring/timeline](../apps/web/src/features/games/play-by-play.tsx), [Game Flow](../apps/web/src/features/games/game-flow-chart.tsx), [advanced game views](../apps/web/src/features/games/game-advanced-analytics.tsx), [shot map](../apps/web/src/features/games/shot-map.tsx).

| Surface | Decision |
| --- | --- |
| Score header | **Keep** teams, score, date, final/OT status and compact shots. Team record is secondary. On deep analytical tabs, reduce repeated header height before shrinking the actual data. |
| Scoring & Timeline | **Put Scoring Summary first.** Game Flow currently precedes the scoring plays. The first answer should be who scored and when. |
| Game Flow | **Move below scoring or into an optional analysis section.** Keep the two useful modes, five-minute-window explanation, model attribution and statement that pressure is not a prediction. Do not add more “momentum” interpretations. |
| Period xG table | **Move with Game Flow.** It is supporting detail, not a second required headline summary. |
| Recorded-play count; goal count; “Goals and penalties are highlighted” | **Remove generic counts/instructions where the content is self-evident.** Preserve period/time/score context. |
| Period timeline | **Keep collapsed by period.** This already handles depth well. Do not show all faceoffs, stoppages and other events by default. Keep player links and meaningful goal/penalty labels. |
| Skater box scores | **Keep** G, A, PTS, SOG and TOI. Keep HIT, BLK, PIM and +/- available in an expanded preset; they need not all compete for initial width. Jersey number is secondary but can help identify a player. |
| Goalie box scores | **Keep** decision, SA, SV, GA, SV%, TOI. **Move** EV and PP save/goal splits to expanded detail. Dressed nonparticipants should be explicitly DNP or omitted from the main playing-stat list. |
| Team-by-team box-score headers | **Remove** repeated “Official NHL player results for this game” and skater/goalie counts. The team labels and tables already establish that. |
| Advanced Team Stats | **Simplify** to a compact xG comparison and a situation table/preset. Avoid repeating both teams’ same all-situations xG values in several large cards. Keep situation splits available. |
| Advanced Players | **Keep** workload, individual xG, on-ice share, Game Score and goalie GSAx where supported. **Move** repeated official totals and Expected SOG to secondary columns. Preserve the all-situations label. |
| Game combinations | **Keep as specialist detail.** Default to team, players, TOI and xG%. Move CF%, FF%, xGF/xGA, SOG/SA and GF/GA into presets rather than showing 12 columns immediately. |
| Shot maps | **Keep.** Spatial context adds information unavailable in a totals table. Preserve selected-shot shooter, result, time, situation, xG and goalie. Distance, shot type and recorded score belong in selected-event detail. |
| Shot-map descriptions | **Shorten** the regulation-scale/coordinate-normalization paragraph. Keep “Both teams attack right,” the outcome legend, marker-size meaning, coordinate coverage and keyboard help. Avoid repeating the full legend and instructions for each team when shared help will work. |
| Advanced wrapper | **Remove/reduce** “MoneyPuck game analytics” + “How the Game Was Played” + feature-list paragraph before the subview tabs. In the inspected screenshot the shot map had not begun by the bottom of the first screen. |

## 6. Team directory and team profile

Evidence: [directory](../apps/web/src/app/teams/page.tsx), [profile](../apps/web/src/app/teams/[id]/page.tsx), [overview](../apps/web/src/features/teams/team-season-identity.tsx), [result map](../apps/web/src/features/teams/team-performance-result-map.tsx).

**Directory:** Keep conference/division grouping, season, names and logos. Remove division team counts and repeated abbreviations where the full name is already prominent. Shorten or remove the sentence instructing users to select a club. Do not reintroduce search or standings cards: this is a directory, and its current narrow responsibility is good.

**Profile identity:** Keep name/logo, season and phase. Remove the “Team profile” eyebrow. Season/phase badges need not duplicate nearby controls. Move Draft History to a secondary action instead of giving it equal prominence on every team view.

**Overview:**

- Keep the compact four-metric league comparison: points percentage/win percentage, goals per game, goals allowed per game and shot differential.
- Correct “Standings points earned” when the displayed value is a percentage. “Points Percentage” avoids needing a second sentence to explain the value.
- Choose one compact rank presentation. Numeric “1st of 32” plus a separate league-position strip encodes the same fact twice. Prefer the numeric rank; retain a visual strip only if it demonstrably improves scanning.
- Restore a compact overall record and points alongside identity or the comparison. The current overview gives many secondary analyses without a straightforward headline W–L–OT record. This is important information, not a new dashboard-card collection.
- Move the full Game Results vs. Share of Play plot into Trends or Advanced. It is a useful investigation, but a large default commitment.
- Replace “Process+ wins” and “Process− losses” with explicit language such as “Wins with 50%+ xG share,” where applicable. Do not imply that one threshold proves whether a win was deserved.
- Keep home/away record as optional useful splits. Move one-goal and extra-time splits alongside them. Remove descriptions such as “At home — Games played on home ice.”
- Remove the full opponent ledger from the default overview. Colorado’s page listed every opponent and all 82 game links after the plot and situational cards. Put head-to-head investigation behind a compact opponent filter in the game log, or an explicit breakdown disclosure.
- Remove the regular-season ledger’s aggregate “series won/tied/lost” count. Its standings-points definition is a constructed summary, not a core season result; it also requires explanation to avoid confusion with playoff series.

**Other profile tabs:**

| View | Decision |
| --- | --- |
| Schedule | **Keep** month grouping and All/Completed/Upcoming. Remove redundant season/phase prose, 0-upcoming counts for completed seasons and a large promotional game-log banner. Use a compact “Detailed Game Log” action. |
| Strength | **Move under schedule context** rather than treating “Strength” as an unexplained peer of Overview. The full feature need not be deleted. See the next section. |
| Trends | **Keep** window, venue and goals/xG series controls. Preserve the important fact that venue filtering happens before rolling calculations. Shorten the surrounding implementation prose. |
| Skaters / Goalies | **Keep** player links and season production. “33 player-team rows” should read “33 skaters” or be omitted. Keep the team-specific split distinction once. A single Players tab with a skater/goalie switch is a reasonable later consolidation, not a prerequisite. |
| Advanced | **Remove the three large 5v5 xG/CF/FF cards** duplicated in the five-row situation table. Keep the table and definitions on demand. |
| Combinations | **Keep** team context and the 50-minute qualification. Show one unit type at a time, as the league explorer does, instead of two tables and two toolbars. Retain the league-ranking link. |

## 7. Strength of schedule

Evidence: [strength presentation](../apps/web/src/features/teams/schedule-strength.tsx), [supporting table](../apps/web/src/features/teams/schedule-strength-table.tsx).

Keep the central question: how difficult were the opponents already faced, and how difficult are the opponents remaining?

- **Keep** the selected strength measure, completed/remaining average, number of rated games, and supporting games.
- **Simplify** the summaries. The active measure, home share, back-to-backs, travel and a separate Rated Games tile produce five visible tiles per summary. Fold coverage into the main value’s caption; do not treat it as another statistic.
- **Remove** the empty Remaining Schedule panel for a completed season. In the inspected season it repeated no-rated-games, 0 home/away, no travel, and zero sample information. One “Season complete” line is enough.
- **Move/defer** estimated travel and distance per leg from the headline. They are market-to-market approximations, not actual itineraries, and the page does not establish their performance effect. Keep rest/back-to-back context in supporting game detail.
- **Move** alternate strength methodologies into a compact selector/disclosure. Do not delete their definitions if the measures remain selectable.
- **Keep concise methodology** explaining prior-game ratings and previous-season fallback. Move full travel caveats beside travel if retained, rather than putting a large mixed-method paragraph under the entire page.
- **Retain table context** Date, Opponent, Site, Rating, Prior GP, Rest, Result. Travel is optional. Clarify “Strength” to “Schedule Difficulty” or “Strength of Schedule.”

## 8. Player directory

Evidence: [player directory](../apps/web/src/app/players/page.tsx), [filters](../apps/web/src/features/players/player-directory-filters.tsx).

- **Keep** name search, skater/goalie choice, position, season and phase.
- **Keep optional** minimum games and scoring/win/save-rate filters. The current collapsed Advanced Filters pattern is good.
- **Keep birthplace filters secondary.** Country, province/state and city are niche but do not burden the default when collapsed. Do not remove them solely because they are specialized.
- **Remove the Teams-count column** from the default skater table. Team identity is already present; “played for two teams” is a detail, not a core leaderboard dimension.
- **Keep skater default** Player, GP, G, A, PTS, SOG. Move +/- and PIM to expanded columns.
- **Keep goalie default** Goalie, GP, W, SV%; add/retain a clear workload context. GS, L, OTL, GA and total saves can be secondary. The team goalie table already offers GAA; avoid an inconsistent emphasis on raw saves in one place and rates in another.
- **Correct the unqualified goalie default:** it sorts SV% with minimum games set to zero. Clearly label it unqualified, or establish a visible participation default before presenting it as a useful performance ranking. Do not quietly choose a new qualification rule during a copy-only pass.
- **Shorten** the page introduction. Keep “Totals combine all teams” once, since it distinguishes this table from advanced player-team splits.
- **Preserve mobile sorting.** The separate sort/direction controls are mobile-only because the mobile directory uses cards; they are not redundant desktop controls to delete wholesale.
- **Keep** Compare Players as a contextual action here.

## 9. Player profiles and game logs

Evidence: [profile](../apps/web/src/app/players/[id]/page.tsx), [player queries](../apps/web/src/data/players.ts), [available seasons](../apps/web/src/data/seasons.ts), [player game log](../apps/web/src/app/players/[id]/games/page.tsx), [team game log](../apps/web/src/app/teams/[id]/games/page.tsx).

### Profile content

- **Move biography after season performance.** Birth date/place, size, handedness and draft information currently come before the statistics. Keep them in one compact details section. Do not delete player identity or draft linkage.
- **Remove empty biography tiles.** For an historical-only profile, three “Unavailable” blocks do not provide value. Use a short profile-coverage note if needed.
- **Keep skater headline** GP, G, A, PTS; shots and power-play goals are useful secondary context. Move +/- and PIM to detail. Remove Teams count from the headline.
- **Keep goalie headline** GP, W, SV% and a rate such as GAA where available. GS, L, OTL, GA and saves need not all be equal headline metrics. Remove Teams count.
- **Simplify** “Selected season” → “Skater Totals” → “Regular Season.” The season and phase controls already supply much of that context.
- **Use a compact Game Log action**, not a large two-line promotional banner. Make game-by-game detail easy to find alongside Trends and Season History.
- **Keep Trends** and its one-metric/window/venue design. Remove “One metric at a time keeps the trend readable,” which explains a design choice rather than the statistic. Keep metric sample size and coverage.
- **Remove duplicate advanced cards** above the situation table. On traded players the card code takes the first matching team row, so apparently player-wide headlines can also be ambiguous. Preserve team splits, situation and workload in the actual comparison.
- **Remove the Situation column** when the whole player table is already filtered to a single situation. Keep it in a table that genuinely compares multiple situations.
- **Do not offer a prominent playoff Advanced tab simply to show an unsupported-data paragraph.** Hide/disable it with a short explanation and retain a clear notice for direct links.
- **Correct Season History’s controls:** it displays both Regular Season and Playoffs tables regardless of the phase switch; the season selector does not narrow those tables either. Show an explicitly whole-career view with meaningful phase behavior, rather than decorative controls.

### Historical-profile trust gap — high priority

The History Record Book links to `/players/8447400`. The inspected Wayne Gretzky profile displays no season or career statistics, only a name and sparse biography. The query reads the detailed `skater_season_stats` / `goalie_season_stats` tables; the historical rankings use separate all-time tables. The season picker also uses the detailed-season list.

**Correct the promise and destination.** Prefer connecting profiles to available historical totals. Until then, link to meaningful historical results or explicitly label the profile coverage. Do not “simplify” by merely hiding the empty statistics problem.

Relatedly, **do not call partial detailed-era totals “Career Total”** for players whose careers began before that archive. Either source complete career history or state the covered years. The documentation currently claims broader profile support than the inspected implementation provides.

The profile formatter also treats missing draft year as “Undrafted.” **Unknown draft information must not automatically become a confirmed undrafted status.** This is a source-level distinction, not a claim that the observed Gretzky label itself is historically incorrect.

### Team and player game logs

- **Keep** dates, opponent, venue/result, score and the statistics needed to examine each performance.
- **Remove Type** when the log is already filtered to one phase; retain it only in a genuine mixed-phase view.
- **Consider combining Venue with Opponent** as “at”/“vs” to save a column. Keep player team identity when a trade makes it relevant.
- **Team default:** Date, Opponent, Result/Score, SOG, opponent SOG, 5v5 xG%. Move xGF and xGA to expanded detail.
- **Skater default:** Date, Opponent, Score, G, A, PTS, SOG, TOI. Move HIT, BLK, +/-, Game Score, ixG and on-ice xG% into intentional traditional/advanced presets.
- **Goalie default:** Date, Opponent, Decision, SA, GA, SV%, TOI; GSAx belongs in an advanced preset. Start flag and raw saves are secondary.
- **Keep at most one compact recent-form strip.** It helps scanning if each item exposes a date/opponent on interaction. Remove “Newest game appears first” and repeated recent/full-season section scaffolding.
- **Correct dressed-backup rows.** Andersen’s log labels the results “Goalie appearances” and counted 74 games, but inspected rows include 0:00, no decision and all-zero playing totals. Default to actual appearances; offer DNP/bench listings only when explicitly requested. Never mistake those rows for poor playing performances or count them in “last ten appearances.”
- **Preserve coverage labels:** team advanced log fields are 5v5; player advanced game-log fields are all situations. They cannot be merged without that distinction.

## 10. Player comparison

Evidence: [comparison page](../apps/web/src/app/players/compare/page.tsx), [picker](../apps/web/src/features/players/player-comparison-picker.tsx), [chart](../apps/web/src/features/players/player-direct-comparison-chart.tsx).

- **Keep** two-to-four-player comparison, phase/type/season scope, selected names, remove controls, search and the complete comparison table.
- **Move the chart below the table or make it optional.** It defaults to Games Played, drawing a large bar chart of two simple workload numbers before the meaningful comparison. If a chart remains default, choose a metric with an actual comparison purpose and show workload alongside it.
- **Collapse the selection builder once two players are selected.** Keep an “Edit Players” action. Search suggestions, lineup scaffolding, a selected count, an auto-update explanation and “Comparison shown below” need not all occupy space above the answer.
- **Keep one empty instruction.** “Choose two players” is sufficient; do not repeat it in the picker, two slots, status line and a separate empty panel.
- **Prioritize metrics:** skaters GP, G, A, PTS, P/GP, SOG; goalies GP, W, SV%, GSAx with coverage. +/- and raw saves/GA are secondary. Separate advanced metrics with explicit 5v5/all-situations labels.
- **Do not conflate this with the advanced inline comparison.** This route combines players’ official season totals; the analytics comparison uses qualified player-team rows and per-60 rates. A future consolidation must preserve those meanings.

## 11. League analytics and metric guide

Evidence: [analytics page](../apps/web/src/app/analytics/page.tsx), [query limits](../apps/web/src/data/advanced-leaderboard.ts), [team plot](../apps/web/src/features/teams/team-comparison-scatterplot.tsx), [player plots](../apps/web/src/features/players/player-comparison-plots.tsx), [guide](../apps/web/src/app/analytics/guide/page.tsx).

- **Keep** team/skater/goalie distinction, situation, qualification, source and team splits.
- **Keep compact column presets.** The tables already avoid showing every stored field by default. Improve their content instead of discarding the pattern.
- **Remove empty/misleading presets.** Goalies use the shared Possession button even though their columns have no possession group; it offers no meaningful possession analysis.
- **Reconsider Game Score as the only skater headline metric.** The default table exposes GP, TOI and a composite Game Score while xG measures sit elsewhere. A clearly named task preset is preferable to assuming this composite is the obvious starting point.
- **Move relationship plots into an explicit Explore/Charts view.** A 200-row table, scatterplot, histogram and empty two-player comparison should not be one required page scroll.
- **Move the histogram to optional distribution analysis.** A histogram is valuable for “how unusual is this value?”; it does not need to accompany every pair of selected axes.
- **Reveal direct-comparison controls on request.** Empty Player A/B and Team A/B selectors at the bottom are invitations to another task, not current results.
- **Preserve useful chart controls** such as axes, venue/window where applicable, selected population and fixed scales. Remove explanations of implementation details like why axes remain fixed from primary copy; keep an accessible “How to Read” explanation.
- **Correct population claims.** Skater results are limited to the top 200 by Game Score before being passed to charts. “Qualifying players” and a distribution can be mistaken for the whole qualifying league. Keep “Top 200 by Game Score” explicit at the chart, or broaden the data before making a league-wide claim. Table sorting within this subset does not find the whole league’s leaders in every other metric.
- **Correct team situation scope.** The team relationship plot deliberately remains five-on-five when the outer leaderboard situation changes. Separate these controls visually and label their scopes; do not let one selector appear to control both.
- **Remove “sustainable strength” and the “Results minus process” tooltip number.** Subtracting points percentage/win percentage and xG share does not establish a calibrated overperformance estimate. Both are percentages but measure different things. Keep the descriptive relationship; avoid predictive language.
- **Shorten the shared introduction by entity.** Team analytics does not need the traded-player explanation, and goalie analytics does not need “individual creation” and possession copy before its table.
- **Keep the Metric Guide.** Its definitions, individual-versus-on-ice distinction and sample/situation cautions directly reduce misunderstanding.
- **Remove the guide’s season selector.** The definitions do not change with season. Preserve the previous season in a return link if useful.
- **Move guide access out of the entity-tab competition if simplifying that strip.** “Help / Metric Guide” is a supporting action; Teams/Skaters/Goalies are data choices.
- **Resolve naming inconsistency:** Game Score is described as single-game contribution in the guide, while other views show season or stored-career totals. Label the aggregation explicitly at each use.

## 12. Lines and pairings

Evidence: [explorer](../apps/web/src/app/lines/page.tsx), [presets](../apps/web/src/features/lines/season-unit-tables.tsx), [detail](../apps/web/src/app/lines/[unit]/page.tsx), [query boundary](../apps/web/src/data/season-units.ts).

- **Keep** forward-line/pairing choice, team, season, full/10/20/40-team-game sample, minimum shared TOI and core table. These choices materially affect the result.
- **Keep** GP and TOI alongside xG%; tiny samples must not look established.
- **Keep advanced columns optional:** CF%, xGF/xGA, goals and shots for/against are useful support, not all required upfront.
- **Simplify** “Top Combinations” / “Forward Lines” / “Three-player combinations at five-on-five” / qualifying-unit count. One title plus sample context is enough.
- **Keep “How sample windows work” collapsed.** Explain that these are each team’s last games, not the line’s last appearances.
- **Correct population/count wording.** The query returns at most 100 units per type, ordered by xG%, before alternative sorting and pagination. The displayed 25-row page is called “25 qualifying units.” Label both the current page and the capped ranking universe accurately; do not imply every qualifying unit is available.
- **Keep supporting-game detail.** It gives evidence behind the aggregate. Include the selected season clearly near the player names; the current heading is only “Forward Line” or “Defensive Pairing.”
- **Preserve selected rolling-window context on drill-down, or explicitly say “Full-Season Supporting Games.”** The current detail link carries season and team but not the rolling sample, and opens all supporting games. That can make evidence appear inconsistent with the ranked sample.
- **Simplify detail fields:** Date, Opponent, TOI, xG% and relevant outcome are core; CF% and three separate for/against pairs can be expanded.

## 13. Drafts

Evidence: [draft workspace](../apps/web/src/app/drafts/page.tsx), [outcome plot](../apps/web/src/features/drafts/draft-outcome-plot.tsx), [team visuals](../apps/web/src/features/drafts/team-drafting-visuals.tsx), [class distributions](../apps/web/src/features/drafts/class-ranking-visuals.tsx).

### Draft Board

**Keep** every official selection, including non-NHL players; year/team/round/search; overall pick, player, team and position. Keep year when browsing multiple drafts. Round is useful even alongside overall pick. **Move** country, amateur club/league and pick-ownership history to secondary row detail when they make the main board busy. Preserve the actual trade chain; do not reduce away the distinction between drafting club and original pick owner. Remove generic “selections refresh” prose if the control behavior is otherwise clear. A 75-row default is heavy; use the existing 25/50/100 convention rather than inventing another page-size model.

### Player Outcomes

- **Keep** draft-position versus outcome. This is a meaningful relationship, not a decorative chart.
- **Keep compactly** pick count, NHL appearance rate, 100-game rate and games per pick for mature classes. These summarize an entire class; they are not equivalent to repeating a single player’s table row.
- **Keep the developing-class warning.** Zero NHL appearances immediately after a draft is progress-to-date, not a final failure rate.
- **Simplify the default metric set** to NHL games, skater points and goalie wins. Move/defer stored career Game Score, ixG, on-ice xG% and GSAx behind an Advanced option. They require coverage and positional interpretation, especially across eras.
- **Move Class Leaders to optional detail.** Fifteen games-played leaders repeat the top end of the outcome distribution and do not follow the selected chart metric. If retained, make its independent “By Career GP” basis clear or synchronize it.
- **Remove the developing-class Games Leader tile** when the leader table is also shown; it singles out the same fact twice.

### Team Drafting

- **Keep core** picks, NHL appearance rate, 100-game rate and GP per pick.
- **Keep Value +/- optional with its definition.** It attempts to account for draft position, which is useful, but is a same-year/pick-band games comparison, not a universal talent grade.
- **Move** Late Hit Rate and Goalie Hit Rate to specialist columns; keep their different thresholds and denominators when shown.
- **Defer default Game Score / Skater Pick.** Coverage restrictions, cumulative career opportunity and the unfamiliar composite overwhelm its immediate value here.
- **Keep one optional visual comparison.** The team scatterplot reveals the relationship between hit rate and games per pick; the outcome bars describe another distribution. Do not automatically stack both below a complete ranking table.
- **Keep pick-outcome drill-downs** tied to the same year range. Remove modal summary metrics already visible in the selected ranking row unless the modal needs a small independent scope reminder.
- **Shorten but preserve maturity rules.** One sentence explaining the observed years and incomplete newer classes is enough; avoid repeating the whole selection policy above and below the table.

### Class Rankings

- **Keep sortable descriptive outcomes**, with an explicit warning that older classes have had longer to accumulate returns. Five seasons of observation does not equal equal career opportunity.
- **Move the large “How to read these rankings” introduction into a disclosure.** In the inspected 1280 × 720 screenshot the first screen was almost entirely title, instructions, heatmap legend and four metric-explanation blocks.
- **Remove/de-emphasize Game Score / Skater from the default.** It creates large unavailable historical stretches and a separate coverage explanation. Keep it only in an advanced comparison with a clear covered population.
- **Keep the active-metric heatmap only with a short legend.** “Color follows the sorted metric” is enough; users do not need a paragraph about five bands before reading a number. Never present those bands as an overall grade.
- **Move the all-class career-outcome distribution behind “Compare Distributions.”** The table is paginated to 15 rows, but the subsequent chart renders every mature class. That defeats the content benefit of a short initial ranking.
- **Do not delete the archival denominator or maturity notes.** Removing those would make a cleaner-looking page less trustworthy.

## 14. History

Evidence: [history workspace](../apps/web/src/app/history/page.tsx), [record book and filters](../apps/web/src/features/history/history-record-book.tsx), [history charts](../apps/web/src/features/history/history-visuals.tsx), [decade leaders](../apps/web/src/features/history/history-decade-leaders.tsx).

- **Keep** Record Book, Careers and Single Seasons. Historical records are a clear research task and already have a dedicated destination.
- **Keep the compact record-leader lists.** They offer a meaningful entrance to complete rankings. Do not expand them with more record categories solely because the database supports them.
- **Move career-record progression** to optional historical context. It reveals a distinct timeline, but is not necessary before a user can find the leaders.
- **Move scoring environment to the Era Adjusted area** instead of repeating it in the Record Book and era views.
- **Remove the three discovery/promotional links** when they merely repeat the visible Peaks, Era Adjusted and Single Seasons tabs.
- **Simplify ranking scaffolding:** “Points Leaders” and “Points Ranking” need not both be headings. Show phase, range, minimum and eligibility once beside results. A default minimum of zero needs no separate headline tile.
- **Keep qualification information prominent for rates.** It prevents tiny samples from dominating. Keep totals/rates and source-era cutoffs understandable.
- **Keep filters collapsed unless active.** Start/end season, minimum games, position, played-for team and known birth country all have legitimate research uses.
- **Put “Played For” semantics next to that active filter.** It selects whole associated seasons, including combined totals from multi-team seasons. Hiding this only in general coverage help makes filtered results easy to misread.
- **Keep team lineage limits near team career results.** Source team identity is not necessarily whole-franchise history.
- **Move Peaks under an advanced historical-analysis entry point if reducing top-level choices.** Retain 3/5-season windows and GP qualification. Explicitly state that overlapping stretches for the same player can appear; these are ranked stretches, not one best entry per player.
- **Keep Era Adjusted as deliberate specialist analysis, not a default discovery obligation.** The indexes add contemporary-league context but do not normalize every era difference.
- **Put the era ranking before decade leaders and the environment chart.** Currently the requested ranking is below two other investigations. Keep “100 = league average” near the index; move the extra 125/150/200 examples into help.
- **Move decade leaders to their own disclosure/context area.** The global decade boards and environment charts do not follow every player filter below them. Their scope must remain explicit.
- **Correct historical player links/profile promises** as described in section 9. Archive depth is valuable only when drill-downs continue to meaningful information.

## 15. Loading, missing, empty and error content

Evidence: [loading component](../apps/web/src/components/ui/route-loading.tsx), [error](../apps/web/src/app/error.tsx), [not found](../apps/web/src/app/not-found.tsx), conditional branches in the audited pages.

| State | Decision |
| --- | --- |
| Loading | **Keep** one status and a skeleton appropriate to the page. Team detail loading currently inherits “Loading team directory…”; use a truthful general label or route-specific text. Avoid skeletons suggesting cards on a table-only destination. |
| No filter matches | **Keep** one explanation and a way to clear/change filters. Remove duplicate “no selections” messages in both panel heading and body. |
| Did not participate | **Keep concise.** This is meaningfully different from missing ingestion. Do not turn it into zeros or a large warning card. |
| No future games | **Keep one line**, or omit an optional block. Do not render a dashboard of empty future metrics. |
| Unsupported advanced history/phase | **Keep the boundary**, preferably near a disabled control or direct-link fallback. Do not repeatedly invite users into known unavailable panels. |
| Partial coordinate/model sample | **Keep counts and coverage.** Missing mapped events cannot disappear silently when interpreting a shot plot. |
| Unknown biography | **Remove empty fields; preserve uncertainty.** Unknown is not Undrafted, zero size, or no birthplace. |
| Runtime error | **Simplify to “We couldn’t load this page. Try again.”** The source’s speculation that the service may still be starting is implementation detail. Keep Retry and Home. |
| 404 | **Use “Page Not Found.”** “This page is off the ice” is harmless personality but less direct; the clear title and recovery actions matter more. |

## 16. Metric-by-metric default policy

This is a presentation policy, not a proposed change to statistical definitions.

| Information | Default treatment |
| --- | --- |
| Who, season, phase, date, opponent, result | Always visible where relevant |
| Workload: GP, TOI, relevant sample minimum | Visible with rates and advanced comparisons |
| Team W–L–OT, PTS; player G/A/PTS; goalie SV% | Core task-dependent information |
| xG%, individual xG, GSAx | Core within the appropriate analytical task, with situation and unit |
| Corsi and Fenwick | Optional possession detail; usually no need for both as large headline cards |
| xGF/xGA totals alongside xG share | Supporting detail unless comparing chance volume is the primary question |
| PIM, +/-, hits, blocks | Available in detail/presets, not universal overview headlines |
| Raw goalie saves/GA/expected SOG, EV/PP splits | Detailed context, not all equal headline metrics |
| Teams-played-for count | Remove from default tables/cards; preserve identities and trade context |
| Birthplace, height/weight, handedness | Compact profile detail or optional research filters |
| Expected/model-based career draft outcomes | Advanced/deferred, with complete coverage explanation |
| Custom indexes and draft “value” | Specialist views with a local definition; never imply a universal grade |
| Rest/back-to-back/travel | Supporting schedule context; estimated travel lowest priority |
| Zero active filters, repeated row counts, repeated title labels | Remove unless they communicate a useful state |
| Unknown/missing/unsupported/zero distinction | Preserve everywhere |

## 17. Recommended order of work

### First: content-trust corrections

Address historical profile/career coverage; upcoming-game missing-analytics states; DNP goalie rows labeled appearances; no-effect history/progression controls; capped ranking/distribution scope; and predictive “sustainable” language. These are more important than trimming a sentence.

### Second: high-confidence subtraction

Remove homepage Recent Form and League Trends; homepage promotional blocks; repeated advanced-stat cards; repeated generic glossaries; “No extra filters” and inactive Clear controls; redundant eyebrows/view labels; future-game shot placeholders; empty completed-season remaining-schedule panels; default Teams counts; and phase-Type columns in single-phase logs.

### Third: reorder and progressively reveal

Put scoring before Game Flow, season performance before biography, comparison tables before optional charts, and era/class rankings before explanatory or distribution blocks. Move the team opponent ledger and results/process plot off the default overview. Consolidate specialist fields through existing presets and disclosures.

### Fourth: deliberate product choices

Evaluate consolidating Skaters/Goalies into Players on team profiles, nesting schedule strength, reducing the prominence of Peaks/Era Adjusted, and hiding advanced draft metrics. These affect how users find existing tasks and should be reviewed as coherent navigation changes rather than incidental copy deletions.

No blanket deletion of Analytics, History, Drafts, shot maps, qualification controls or source notes is recommended.

## 18. Acceptance criteria for a later implementation

- Each page states its subject and gives its main answer before optional explanation or another task’s controls.
- Every visible control changes the displayed content or has a clearly labeled navigation purpose.
- Repeated statistics survive only when the second presentation provides a distinct scanning or comparison benefit.
- Default charts answer a meaningful question; they are not large illustrations of two simple numbers.
- Scheduled, missing, unsupported, did-not-play and actual-zero states remain distinct.
- “Career,” “league,” “qualifying,” “recent,” “final” and “advanced” match the displayed population and time scope.
- Numeric tables retain sorting, identity, readable units, workload and access to useful secondary columns.
- Source notes and accessible alternatives remain available; essential qualifiers stay beside the affected result.
- Existing deep links still open a meaningful destination after a section is moved or hidden.
- Check desktop and mobile with the actual viewport verified, and inspect both themes after visual implementation.
- Review every affected empty/unsupported state, not just a populated current-season example.

## Source and component completeness notes

The source inventory contains 18 page templates and 56 shared TSX components. Content-bearing families were reviewed across: homepage insights; team identity/schedule/strength/results/trends; player filters/selection/trends/comparison; league and game analytics; lines; scoring/timeline/Game Flow/shot maps; playoff bracket and dialogs; draft outcomes/team/class plots; historical record/filter/decade/chart views; and shared headers, tables, filters, tabs, pagination, loading, dialogs and footer.

Utility-only components such as navigation scrolling, form submission, URL-state helpers, icons, theme persistence and web-vitals collection are not proposed content removals. Their implementation can remain even when some visual copy is removed. The metadata/API layer was considered only where it determines a user-facing claim; this was not a new infrastructure or security audit.

Repository documentation was used for intended scope and metric meaning, but implementation and observed pages took precedence where documentation had drifted—for example historical profile coverage and older descriptions of navigation. The recommendations above concern the current baseline, not a hypothetical redesign.
