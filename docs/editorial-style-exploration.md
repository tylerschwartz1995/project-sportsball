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
