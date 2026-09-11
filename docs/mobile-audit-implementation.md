# Mobile audit implementation — September 10, 2026

The mobile review found fourteen layout and interaction problems. This change
addresses them through shared table behavior and targeted page layouts, while
retaining the dark/light visual system, sorting, URL filters, and data coverage.

| Audit finding | Implemented behavior |
| --- | --- |
| Player names obscure every statistic | Bounded, wrapping identity column; points or save percentage immediately beside the name. Both Essential and All leave a complete statistic visible at 320px. |
| Historical rank and name consume the phone width | Compact rank and sticky identity; the selected ranking metric moves beside the name in headers and rows together. |
| Playoff dialog squeezes statistics to almost zero height | Full-screen phone/short-screen dialog, compact matchup, wrapping tabs, scrollable panel, and a usable statistics region. Close remains available. |
| Standings loses team identity when scrolling | Sticky team column with points immediately after it; the rank can scroll away. |
| Lines and pairings hide combinations and useful values | Stacked player links, supporting Games link beside the combination, a pinned combination, and xG% first among the statistics. |
| Scoring and draft tables hide essential context | Scorer and score lead the scoring table, with period/time beneath the scorer on phones. Draft pick precedes player and team. All columns remain accessible and sortable. |
| Two-player comparisons require horizontal scrolling | A true three-column layout fits both players and metric labels. Three/four-player comparisons retain horizontal scrolling and a pinned metric column. |
| Nested tables trap vertical scrolling and dates wrap | Shared native regions allow vertical scrolling to continue onto the page. Game-log dates stay on one line. |
| Filters and schedule controls consume too much height | Phone player filters/sorting share a disclosure with an applied-filter count and nearby Apply action. Schedule controls use a compact grid with less repeated explanatory copy. |
| Later page views are hidden off-screen | Page tabs and series tabs wrap, keeping every view discoverable. |
| Standings plot wastes scarce width | Only wide, highlighted plots reserve endpoint-label space; phone plots retain named highlighting, legend, and tooltips. |
| Touch targets are too small | Primary selectors/disclosures have 44px targets; compact table links and row-count choices have at least 40px targets. |
| Scroll hints are missing or misleading | `TableScroll` measures horizontal and vertical overflow, updates on resize/content changes, and provides matching keyboard and screen-reader guidance. |
| Long tables lose their column headers | Phone tables use a bounded native region with a sticky header. Vertical scrolling can leave the region at either boundary. |

The new bounded tables also exposed a return-navigation issue: React-generated
IDs changed after remounting, so saved inner scroll positions could not be
restored. Scroll restoration now uses structural selectors for those wrappers,
and restores the phone filter disclosure along with table position. Browser
regressions cover both returning from a player and refreshing the list.

## Verification

- `make web-check`: lint, TypeScript, 280 unit tests, and production build.
  Database-dependent tests retain their existing opt-in requirements; no query,
  schema, ingestion, or statistic definition changed.
- Fifteen mobile browser regressions in Chromium and WebKit, including 320,
  390, and 430px tables; 320×568, 375×667, 390×844, and 844×390 dialogs;
  both column presets; two/three-player comparison; sorting and filters;
  sticky headers; scroll guidance; chart width; and return-position restoration.
- The production build passed 90 Chromium browser tests across mobile layout,
  usability, sizing, filter consistency, content, audit, theme contrast, and
  scroll navigation; the fifteen mobile regressions also passed in WebKit.
- A visual/geometry sweep of 42 route states at 320 and 390px, eleven at 430px,
  nine at 768px, and nine at 1440px. No page-level horizontal overflow or browser
  errors were observed. Six additional phone views were checked in light mode.

These are browser-emulation checks, including Safari's WebKit engine, rather
than tests on physical phones with an on-screen keyboard or dynamic browser
chrome. Dense multi-column data still requires horizontal scrolling by design.
No manual deployment was performed.
