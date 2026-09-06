# Modern Stats Exploration

This competing design lives on `agent/editorial-style-exploration`, branched from
`main`. The branch and PR are the deliverable. **Do not merge or deploy it.**

## Direction

A quiet, modern stats interface that makes navigation and information easy to
scan. One consistent Manrope sans-serif family replaces the newspaper masthead,
serif headlines, and selectable font experiments. Geist Mono remains available
for numeric annotations. Fonts are served through Next.js.

The typography scale is fixed across screen sizes: 13px metadata, 14px controls
and table cells, 15px body copy, 18–20px section headings, and 32px page titles
(28px on phones). Legacy component labels have a 13px floor. Scores and chart
annotations retain their meaningful local hierarchy.

Dark mode is the default: neutral graphite surfaces, clear text, and a restrained
mint accent for links and selected controls. Light mode uses white surfaces and
a darker green accent. Semantic tokens also coordinate plots and numeric states.
Neither theme has a decorative grid, glow, or inverted newspaper table headings.

## References

- [FotMob](https://www.fotmob.com/): grouped score rows, clear dates, and familiar
  navigation put useful information ahead of branding.
- [Dunks & Threes](https://dunksandthrees.com/): restrained surfaces and compact
  analytical tables keep a large amount of data approachable.
- [Sofascore](https://www.sofascore.com/): visible selected navigation and scannable
  score lists. Sportsball keeps a quieter shell with fewer competing controls.

These are design references, not sources for Sportsball's statistics. The earlier
Silver Bulletin-inspired editorial explorations are preserved in Git history.

## Page structure

A compact wordmark and sport label sit above one primary navigation row. The
current section has an underline; on narrow screens the row scrolls and brings
that section into view. Theme switching remains available in the header.

The homepage starts with recent results, upcoming games, and standings. Recent
form and scoring leaders follow, with trends and archive links below. All scorer
rows use the same hierarchy. Upcoming fixtures omit repeated team-record badges
on the overview; supporting game pages still show their detailed records.

Shared panels, tables, filters, and team/player identities use consistent type,
subtle boundaries, and rounded corners. Sort controls, phase filters, URL state,
entity links, and statistical definitions retain their existing behavior.

## Implementation and review

`apps/web/src/app/modern.css` owns the alternative theme and shared visual rules.
`globals.css` retains component geometry with a browser-relative root (16px by default) and a readable
minimum for legacy labels. The abandoned editorial and Style Studio styles,
font configuration, and preference controls have been removed. Old palette and
font preferences no longer affect the page; the dark/light preference remains.

Compare the local site with `main` using the same season and viewport. Review the
home, standings, games, analytics, history, and entity pages in both themes and
on desktop and mobile. Check visible information, sorting, filter navigation,
and chart readability as well as appearance.

Validation uses `make web-check`, the existing Playwright browser audit, and a
15-route desktop/mobile dark/light layout sweep against the local database.
Use `SPORTSBALL_E2E_BASE_URL=http://localhost:3000` for the browser audit in this
local environment. No query or database changes are part of this revision.


## Sizing audit follow-up

The shared scale now also reaches utility-based labels and chart props: meaningful
metadata is at least 13px, with 18px panel headings and 20px major sections.
History charts reduce tick density when necessary. Rink orientation labels are
readable, and scatterplots have transparent pointer padding around visible marks.
The root uses the browser’s font-size preference instead of fixing it in pixels.

Selected-player names wrap in full, remove and dialog-close targets are 44px,
and optional suggestions collapse once a comparison has enough players. The
comparison table sizes itself to the number of players, keeps its metric column
visible while scrolling, and provides a scroll cue. Bracket tiles reserve room
for complete team abbreviations and only allocate a seed column when needed.

The mobile score header aligns both scores on the right with smaller crests;
records and shot counts share a supporting line. Player and analytics filters
use tighter working rows, and combination-window explanations live in a native
disclosure. Combination detail shows linked player names separately from its
page title. SVG utility icons and restrained crest scaling unify optical size.
Result-map filters and player controls can reflow when text is enlarged.

Validation includes the existing six browser checks and six sizing regressions
in `apps/web/e2e/sizing.spec.ts`, a 24-view dark/light phone/desktop sweep, and
six enlarged-root layout stress checks. Those stress checks are a diagnostic,
not native iOS/Safari zoom certification. Wide statistical tables still scroll
horizontally; they are not compressed into unreadably narrow columns.

## Full desktop sizing audit implementation

The follow-up implements the complete September 5 desktop audit across the existing exploration branch. It keeps the selected Manrope, graphite/green visual direction and both themes. The root remains at the browser default; these are component reading sizes, not global zoom.

| Audited family | Implemented reading and geometry contract |
| --- | --- |
| Header and navigation | 16px main navigation, 15px subnavigation and phase controls, 14px theme label; retain 22px brand, 32/28px page titles, 18px theme icon and 44px target. |
| Homepage | 20px panel headings and scores, 15px panel actions, 16px team/player names and standings points, 18px scoring-leader points, 14px records and supporting lines; retain 24px trend headlines. Fixture crests alone become 28px. |
| Filters and pagination | 15px field labels, 16px values/actions, 44px native controls; expanded player and History fields use the same scale. Presets and pagination use 40px targets. Descriptions are 14px and optional badges remain 13px. |
| Tables | 14px headers, 16px entity names, 14px context, 15px dense figures and ordinary 500 weight. Sparse standings, player directory, core analytics, team goalie/advanced and playoff scorer tables use 16px figures. Dense rows gain modest padding; analytics and draft padding is separately restrained. Selected metrics retain stronger weight and all numeric alignment remains tabular. |
| Team directory | 17px team names, 18px division names; 32px crests retained. |
| Player profiles | 16px biography, 14px stat labels, 20px totals and 23px headline points/save percentage; 56px profile crests retained. Season-history identity is 16px and dense figures 15px. |
| Team performance and strength | 16px primary metric/result and explanations, 14px supporting text with comfortable line height, 18px strength-panel titles, retained 20px summary values. |
| Advanced profiles | 14px summary labels, retained 20px figures, 16px situation identity, explicit sparse/dense table roles, and 16px space beneath the situation selector. Profile content begins around 32px after phase navigation. |
| Comparison | 16px full player names and values, 15px metric labels, 240px desktop/152px phone sticky metric column. A ResizeObserver shows the scroll cue only when the table actually overflows, including after resizing and player changes. Existing 44px remove buttons remain. |
| Schedule and games | 16px team/date identity, 15px dense scores and figures, 14px context, 16/14px calendar date/count scale. The calendar uses a 16px SVG. Desktop hero names/scores/crests remain 24/52/56px, with the compact mobile score arrangement preserved. |
| Combinations and box scores | 16px identity, 15px dense statistics, 14px jersey/position/status context. Unit names wrap between complete players; individual names never shrink to fit. Detail links keep their 44px targets. |
| Shot maps | Orientation moved outside the scaled SVG into 14px HTML labels; team headings 18px, totals 15px, legend/instructions 14px, selected shooter 16px and detail values 15px. Rink geometry, shot encoding and keyboard interaction are unchanged. |
| Charts and tooltips | 14px ticks, 15px axis titles, 20px chart headings, 16px relationship subheadings, 14px legends and 16px tooltip values. Sparse team markers receive a modest visible increase; dense player marks and expanded hit regions are retained. Duplicate percent suffixes on team scatter axes are removed. |
| Team drafting | 14px ticks/notes, 15px axis titles; 28px nominal row pitch plus axis margins and explicit 18px stacked bars. The plot grows vertically for 32 teams. |
| Draft board and definitions | 16px player identity including unlinked prospects, 14px school/context, 14–15px ranking definitions. Existing 28.8px outcome summaries remain. |
| Playoffs | 15px bracket abbreviations, 16px wins, 14px wrapping round names; 18px dialog team names and unchanged 32px series score. Tabs are 15px/44px, stat toggles 15px/40px, names 16px and figures 15px. Short Games tabs fit their content; all dialogs are capped at viewport height minus 64px and stats scroll internally. |
| History | 20px semibold record headings, 16px names, 18px record numbers, 24px substantial subsection/banner headings, 15px banner values. Ranking headers are at least 44px, with 16px names/15px figures. Era examples use 16px numbers/14px definitions and wrap in pairs; decade labels are 16px. |
| Guide and empty/loading states | Guide terms and reading copy use 16px, 24–26px line height and a bounded measure; section headings are 20px. Empty results use a modest 18px heading and 16px reading/action text; loading copy uses body size. |
| Preserved proportions | Inner content width, 1px separators, 10px panel radius, ordinary panel padding, 24px dense-row crests, dark/light parity, browser text preferences and stable hover/focus dimensions remain intact. |

Validation includes all 51 desktop route requests from the audit, populated regular-season game player/unit analytics, selected shots, four-player and all-column comparisons, expanded filters/calendar, and all four series tabs. Two playoff-game player/unit requests correctly fall back to team data when those datasets are unavailable; populated regular-season views cover the actual components.

The automated browser sweep covers 96 combinations of 24 views × phone/desktop × dark/light, plus 21 checks at 320/768/1920px and six 200%-root-text stress checks. No document overflow or uncaught page errors were found. The enlarged-root checks exercise layout reflow, not native Safari/iOS zoom certification. Wide tables and navigation intentionally scroll internally. Browser regressions cover actual font sizes, metric-column resizing, conditional cues, non-scaling shot labels, dense versus sparse tables, and natural dialog height in addition to the existing interaction checks.

The exploration PR remains open and **must not be merged into main** for this experiment.
