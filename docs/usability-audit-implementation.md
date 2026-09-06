# Usability audit implementation

This change addresses all ten findings from the navigation, first-use, and
information-presentation walkthrough. Statistical definitions and source
coverage remain unchanged.

| Finding | Implemented behavior | Verification |
| --- | --- | --- |
| 1. Historical players are hard to discover | Find a Player searches stored profiles across all seasons and opens Career & Seasons. Empty season searches link to the same search with the name retained. | Gretzky search → career totals → search; parameterized database search tests. |
| 2. Exploration loses context | Entity links retain originating results and phase. Detail tabs retain the return destination. Player, team, and game pages provide Back to Results. Global navigation carries explicit season/phase where supported. | Playoff game → team → Recent Form → original game; filtered-results round trip; URL unit tests. |
| 3. Setup overwhelms the first viewport | Reduced shell, filter, and chart spacing; removed redundant player filter heading; placed desktop filter actions beside the disclosure. | Desktop screenshot shows player rows in the first 720px; responsive sizing checks. |
| 4. Filters imply the wrong scope | The fixed five-on-five team plot has its own scope explanation; situation filters appear with the affected table. Player Type stages changes with the other fields and exposes compatible sort choices before Apply. | Table/chart switching retains situation; staged player-type browser check. |
| 5. Mobile navigation and comparisons are difficult | Explicit grouped Menu exposes every section. Sorting sits outside Advanced Filters. Players default to a compact, horizontally scrollable table with a sticky identity column; cards remain available. | 390px menu, Escape, sorting, table/cards, and overflow checks. |
| 6. Tables are difficult to scan and decode | Tighter standings columns, grouped team analytics headers, stable Essential/All column control, selected-sort accent, and existing hover/focus metric explanations without extra question-mark controls. | Both-theme table walkthrough; column toggles and table sizing checks. |
| 7. Plots lack interpretation and selection | Player charts show latest sample/value and traditional season baseline; standings support highlighting and endpoint labels; scatterplots support named selection and disclose overlapping teams; shot maps filter period/result/shooter and offer attempt lists. | Trend venue/baseline, team overlap selection, standings highlight, and shot filtering/refresh checks. |
| 8. Labels and disclosures hide useful features | Shot Quality, Recent Form, Lines & Pairings, and direct Shot Maps labels; team result map and player comparison plot open by default. | Detail navigation and existing content-availability browser checks. |
| 9. Empty/default states lack guidance | Unplayed draft classes explain why outcomes are absent and link to a mature class; the empty plot remains optional. Upcoming homepage schedule names its own season. | Unplayed draft recovery browser check and source review. |
| 10. Visual hierarchy and affordances are inconsistent | Quieter filter surfaces, consistent control sizing, selected state treatments, visible chart selectors, explanatory readings, and shared theme tokens. | Light/dark screenshots, contrast, keyboard focus, sizing, and overflow suites. |

## Validation

- `make web-check`: lint, TypeScript, unit tests, and production build.
- Database-enabled Vitest suite against the populated local database.
- Playwright: usability, filter consistency, content audit, audit, theme contrast,
  and sizing suites against the running local app.
- Manual browser inspection at desktop and phone widths, including both themes.

These checks establish functional behavior and layout. They do not establish
that first-time users complete tasks faster; that requires observed sessions
with new users. Search covers stored player profiles, limits results to 50, and
asks for a more specific name when the limit is reached. Return links retain one
origin rather than building an unbounded breadcrumb history. Advanced player
metrics keep their existing reference lines rather than introducing a new
season-aggregation definition.
