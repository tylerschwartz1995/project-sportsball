# Mobile layouts — October 21, 2026

At widths up to 767 CSS pixels, statistical tables show the entity on its own
line followed by up to three labelled metrics. The Columns selector exposes all
remaining columns, including rank and home/away records. Existing sorting and
links remain active. Desktop tables retain all columns. Tablet tables retain
contained horizontal scrolling where necessary; the page itself does not scroll
sideways.

Game and team view navigation uses a native selector on phones when there are
more than three tabs. It follows the same resolved URLs as desktop tabs and
preserves the current scroll position. Short tab lists remain visible. Player
and advanced-stat search filters can be expanded without occupying the initial
screen. Game and team line filters use compact grids.

Scoring events and team schedules have dedicated phone arrangements so that
scorer/result information remains visible. Profile biographies wrap on narrow
screens. Game Flow reduces axis space on narrow charts, while team heatmaps
stack vertically. These are presentation changes; queries and metric definitions
are unchanged.

## Browser inspection

Inspected the running local application in Chrome using viewport overrides.
Dimensions below are measured CSS viewport widths (browser zoom was accounted
for), not the dimensions passed to the viewport tool.

| Surface | Views inspected |
| --- | --- |
| Players | Basic and advanced skaters/goalies, expanded filters, regular-season and playoff empty state |
| Player profiles | Skater and goalie career tables, both phases, additional column groups and career totals |
| Game logs | Skater, goalie, and team game logs |
| Teams | Basic and advanced, regular season and populated prior-season playoffs |
| Team detail | Games, Players/skaters, Players/goalies, Lines/forwards and defense, Advanced Stats |
| Standings | League, both conferences, all four divisions, additional record columns |
| Games directory | Scheduled games, completed dates, weekly navigation, calendar expansion and previous/next month |
| Game detail | Scoring, Box Score, Game Flow, Team Stats, Shot Map, Lines |
| Game variants | Both box-score teams and player types, pressure/cumulative charts, both heatmaps, line team/type/minimum controls |
| Supporting pages | Historical player search and results, metric guide, email login, unavailable-page layout |

The main pass used 390px. Additional inspections covered 320px, 430px, 800px
tablet, and 1280px desktop, including dark and light themes. No page-level
horizontal overflow was measured in the inspected views. The 800px desktop-style
table intentionally retains contained scrolling. This is representative route
and view coverage, not every season/player/game record or every filter combination.

Verified that switching column groups retains access to advanced stats and that
sorting ixG still reorders the box score. Changing a game line's Minimum TOI
retained scroll position (630px before and after). Default goalie columns reset
when switching from skaters. The pass found and corrected legacy CSS that hid
standings record columns, clipped names, and left a blank team-schedule header.

## Limits

Local passkey support is disabled, so `/account/security` returns the unavailable
page and the local login has email only. Actual passkey enrollment/sign-in and
account settings were not visually verified with these changes. No production
authentication settings were changed. This was desktop Chrome responsive
inspection, not a physical iOS/Android device or screen-reader certification.

## Regression checks

- Lint, TypeScript, unit tests, and production build before publishing the PR.
- Unit tests ensure every non-identity column remains available exactly once,
  groups remain bounded, and standings preserve their second-column identity.
- Recheck mobile column switching and sorting whenever table schemas change.
- Recheck both themes and the 767px breakpoint when editing shared table CSS.
