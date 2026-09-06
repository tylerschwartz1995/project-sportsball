# Visual polish audit — September 6, 2026

This pass fixes the confirmed small and medium presentation defects found in
local browser inspection. It preserves the Modern Stats Exploration design,
statistical definitions, data coverage, and existing page structure. The PR is
left unmerged for Tyler's review.

## Findings and fixes

| Area | Before | Correction |
| --- | --- | --- |
| Playoff bracket | Each round's matchups took 100% of the round height in addition to its heading, hiding the last matchups behind an internal vertical scrollbar. | Shared grid rows account for headings and matchups. All cards fit vertically; narrow layouts retain horizontal scrolling, a visible hint, and a keyboard-focusable region. |
| Phone week/month calendars | Dates and “No games”/game-count labels spilled into neighboring cells. | Phone cells use day numbers and compact counts, with a nearby explanation and full accessible link names. Desktop labels retain their full wording. |
| Disabled schedule dates | A broad span selector applied uppercase, tracking, and monospace styling to the whole disabled day. | Only the weekday label receives that treatment; zero-game styling also applies to disabled dates. |
| Phone schedule controls | Calendar buttons wrapped mid-label, arrows separated from navigation text, and the date heading competed with the timezone note. | Buttons keep their labels together; week/day navigation uses deliberate rows, and the results heading stacks above its note. |
| Pagination | Next wrapped onto a separate row while Previous and page numbers remained above. | On phones, page numbers occupy one row and both direction controls share the next. Controls maintain 40px minimum height and tabular numerals. |
| Essential table columns | Hiding colgroups retained fixed table layout, compressing draft-class headings and percentages until they collided. | Essential views use content-based column sizing and internal scrolling. Draft-class rankings also use content-based sizing with all columns shown. |
| Team advanced statistics | Six-character totals exceeded narrow four-rem numeric columns. | Decimal totals receive the wider numeric track already used for percentages. |
| Historical peaks | A complete three/five-season range was forced into a normal stat column. | The stretch heading reserves a 12rem track for the full range. |
| Metric help | Custom tooltip text was clipped by scroll containers and viewport edges; link-based headers did not show the same custom help. | Mouse and keyboard help renders outside the table scroll container, clamps to the viewport, and stays within a modal's top layer when appropriate. Hovering the bubble keeps it visible. Escape dismisses help before closing a dialog. Descriptions remain available to assistive technology when the bubble is closed. |
| Team form chart | A second “50%” label sat over the data near the already-labeled 50% axis tick. | Keep the dashed reference line and axis tick; remove the duplicate overlay label. |
| Phone standings grouping | The “Group by” prefix pushed Division beyond the visible control area. | Hide the redundant visual prefix on phones while retaining the named navigation and all three choices. |

## Audit coverage

The populated local app was inspected in Chromium at phone and desktop sizes,
with dark and light screenshots. The initial matrix covered 26 route states at
320, 390, and 1280px, plus both themes at 390 and 1280px. A second matrix covered
18 additional detail/tab states at 390, 768, 1024, and 1440px. Checks combined
screenshots, text/cell bounds, image loading, page overflow, and interactions.

Areas included home, standings, schedule and expanded calendar, teams, players,
search, profiles, game logs, player comparison, analytics and its guide, lines
and pairings, playoffs and series dialogs, drafts and class rankings, history
and peak/era views, game scoring/box-score/shot-map views, and not-found recovery.
Existing browser stories also verify filters, sorting, theme persistence,
mobile navigation, selected-player controls, and chart interactions.

Final screenshots rechecked the changed calendar, bracket, class rankings,
advanced team statistics, peaks, standings, and team form views at 390 and
1280px in both themes. No confirmed finding from this pass remains open.
This is representative browser coverage, not a claim that every historical
record, device, or browser engine has been exhaustively tested.

## Validation

- `make web-check`: lint, TypeScript, production build, and 262 tests passed.
  The 16 opt-in database tests were skipped; query behavior did not change.
- Existing 56 non-fixture/non-performance browser regressions passed, alongside
  the new visual regressions. The final focused pass ran all 13 new checks,
  including metric help inside the series dialog.
- The new `e2e/visual-polish.spec.ts` checks bracket containment, calendar text
  bounds and navigation in both themes at four widths, pagination, dense table
  cells in essential/all views, and pointer/keyboard tooltip behavior.
- The complete diff was reviewed for theme tokens, keyboard behavior,
  statistical presentation, and unwanted data or navigation changes.

No ingestion, schema changes, production writes, deployment, or merge are part
of this task. GitHub CI results are recorded on the PR.
