# Content audit implementation

This branch applies the [full baseline audit](content-audit-2026-09-06.md).
The product rule is that information should answer the current question, help
choose an action, or prevent a misleading interpretation. Availability in the
database alone does not justify prominent placement.

## Decisions by surface

| Surface | Result |
| --- | --- |
| Shared shell | Keep the nine primary destinations and theme control. Remove generic page eyebrows and view-strip labels. Keep accessible navigation labels. Correct the internal metric-guide arrow. |
| Filters | Keep meaningful labels, URL context and apply behavior. Omit zero-active counts and inactive Clear actions. Retain mobile sorting and optional research filters. |
| Homepage | Results, upcoming games, standings and scoring leaders remain. Remove Recent Form, League Trends and duplicate destination promotions, including their extra data queries. Label regular-season lists and upcoming season context; remove the unconditional final-snapshot claim. |
| Standings | Keep PTS and W–L–OT in the core table. RW, goals and differential are expanded columns. Hide irrelevant grouping controls in Points Progression. Consolidate snapshot/source/clinch notes once. Omit division text from team rows and let team names determine column width. |
| Schedule | Remove repeated phase descriptions and pregame shots/score/record placeholders. Empty schedules retain season/phase recovery. Keep calendar, week and direct date access; day navigation remains available as a compact browsing control. |
| Game detail | Scheduled games show identity/time/status without an empty analytics warning. Scoring precedes Game Flow, which remains visible by default following Tyler’s review. Keep period timeline disclosure, source and shot-map coverage. Box scores and advanced unit/player tables expose secondary columns on request. Remove the large advanced wrapper introduction. |
| Team directory | Keep conference/division/name/logo grouping. Remove duplicated abbreviations, counts and selection instructions. |
| Team overview | Show a compact regular-season W–L–OT record and points (playoffs use W–L). Use Points Percentage and one numeric rank representation. Result/process analysis, situations and opponent results are disclosed. Remove the aggregate constructed series-outcome count. |
| Team navigation | Schedule Difficulty is nested under Schedule. Players groups skaters and goalies. Combinations shows one unit type at a time, retaining the 50-minute team qualification and league link. |
| Schedule difficulty | Keep average rating and its rated sample. Omit empty remaining-schedule panels. Move travel/rest summary detail and methodology into disclosures; travel is an expanded table column. |
| Player directory | Core skater totals and goalie workload/wins/save percentage remain. Other columns are optional. Explicitly label an unqualified goalie listing instead of silently introducing a qualification rule. |
| Player profile | Put performance before known biography. Unknown draft data is not Undrafted. Replace the game-log banner with a compact action. Remove duplicated team-specific advanced cards; filter context replaces repeated Situation cells. Hide known unsupported historical/playoff analytics invitations while retaining direct-link coverage notices. |
| Historical careers | Read the complete NHL summary archive, with detailed-season fallback for missing archive seasons, without adding overlapping totals. Season History respects phase and omits the irrelevant season picker. Historical-only profiles have real season totals. Career SV% is weighted from saves/shots; incomplete shot coverage remains unavailable. |
| Game logs | Show actual goalie appearances, excluding dressed backups with no playing evidence. Phase Type, secondary traditional metrics and advanced detail are outside the default columns. Preserve player team identity and explicit team-5v5/player-all-situations meanings. |
| Comparison | Keep selected names and removal actions visible. Collapse search after two selections, show the table first and make the chart optional. Its initial metric is points or save percentage. Preserve the distinction between combined official totals and advanced player-team comparisons. |
| Analytics | Table and Charts are explicit choices. Histograms and direct comparisons are optional. Show all columns in one sortable table, without column presets, following Tyler’s review. Remove the redundant player-level regular-season notice; the page subtitle retains phase context. State the top-200 selection basis. Keep the team chart’s separate five-on-five scope. Remove predictive “sustainable” and results-minus-process claims. |
| Metric guide | Retain definitions and coverage, remove the irrelevant season picker, and explain season/career Game Score aggregation. Keep a guide link in the analytics navigation for discoverability rather than adding another help menu. |
| Combinations | Keep sample/workload and show all columns without presets. State the capped top-100 universe and displayed-row count. Detail explicitly says Full-Season Supporting Games and includes season identity; additional for/against measures are optional. |
| Draft board | Keep complete selections, search and pick ownership. Use 25 rows by default. Preserve country and archival pick context on the dedicated board because they support identification of players without NHL profiles. |
| Draft outcomes | Keep the meaningful draft-position plot and maturity warning. Advanced outcome metrics require an explicit choice. Career-GP leaders are optional and independently labeled. Remove the repeated developing-class Games Leader tile. |
| Team/class drafting | Keep core denominators and descriptive returns. Specialist metrics are expanded columns. Definitions and distributions are optional; expensive distributions mount only on request. Remove duplicate team-modal summary metrics. Preserve maturity and unequal-career-opportunity cautions. |
| History | Keep concise record lists and intentional Careers/Seasons/Peaks/Eras views. Remove duplicate promotion cards, make progression optional, and put era rankings before optional global environment/decade context. Keep qualification and place played-for/team-lineage caveats near results. State that peak stretches may overlap. |
| System states | Use clear Page Not Found, retry/home recovery and general team-data loading text. Keep missing, unsupported, no participation and zero distinct. |

## Deliberate boundaries

This is a presentation and coverage correction, not a change to metric
formulas, ingestion, production data or deployment. Existing analytical tools
remain available when they support a deliberate task. The original audit’s
conditional consolidation suggestions are resolved through existing tabs,
disclosures and secondary columns rather than deleting entire destinations.

The top-200 player-team and top-100 unit query limits remain, now explicitly
labeled. These are capped comparison populations, not a complete reranking of
the league for every alternate metric. Unit drill-downs intentionally show full
season evidence and say so. Historical biography can still be unavailable even
when the career statistics are complete.

## Validation

- Web lint, type checking and production build passed.
- All 242 unit/database tests passed, including read-only checks for historical totals and goalie appearances.
- All 35 browser regressions passed, covering 390px and desktop content, table sorting,
  schedule recovery, historical phases, theme contrast and existing interaction flows.
- Visual inspection of local dark/light pages through the browser.

Run browser checks against `http://localhost:3000` for the current local preview;
its `127.0.0.1` development websocket connection does not hydrate reliably.
No application deployment or production writes are part of this branch.
