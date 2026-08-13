# Desktop UX regression checklist

Use this checklist after a user-facing web change and before merging a broad UI
release. The baseline viewport is 1280 by 720 pixels with the desktop sidebar
visible. Wider desktop checks are useful, but they do not replace this
constrained-width pass. Mobile is tracked separately.

## Automated checks

Run `make web-check`, then verify the required `Web application` and
`Python pipeline` GitHub checks pass. The browser pass should confirm on every
representative route that:

- the page has a visible heading and no rendered application error;
- the document does not overflow horizontally;
- images load successfully;
- selects have accessible labels and buttons have accessible names; and
- the main task and its controls are understandable without hidden context.

## Representative route matrix

Check both dark and light themes across the route set. Use current records from
the local database when an example identifier changes.

| Area | Representative routes and states |
| --- | --- |
| Follow | Home, standings, schedule/results, playoffs bracket and statistics |
| Explore | Team directory, player directory, team overview/trends/advanced/game log, player overview/trends/advanced/game log, player comparison |
| Research | Team/skater/goalie analytics, metric guide, draft board/outcomes/teams/classes, history overview/careers/seasons/peaks/eras |
| Games | Scoring summary, box score, advanced game view, game flow controls |
| Combinations | Lines, pairings, pagination, and a line-detail page |

## Critical interaction stories

### Schedule and filters

- The team control contains `All Teams` plus every club represented in the
  selected season and phase.
- Season, phase, team, and date selections update automatically and remain in
  the URL after refresh or browser back/forward navigation.
- `Calendar View` opens a complete month view; selecting a date returns to the
  corresponding week and daily results.
- Previous/next day and week controls make their destination clear, and empty
  dates distinguish no games from missing data.
- The four desktop filter controls fit at 1280 pixels: phase labels stay on one
  line and full team names remain readable.

### Tables and long results

- Numeric columns sort in both directions, with the active sort announced in
  the URL and header state.
- Column presets retain the identity column and explain unfamiliar metrics.
- Long results expose 25, 50, and 100 row sizes, a current range, previous/next
  controls, and stable state after refresh.
- Sticky headers and identity columns remain aligned while a table scrolls.

### Navigation and information hierarchy

- Sidebar groups and active states correctly distinguish Follow, Explore, and
  Research destinations.
- Page-view tabs, season phase controls, filters, and in-page actions use
  visually distinct patterns.
- Teams, players, and games link to their available detail pages.
- Scoreboards, playoff brackets, and dense tables remain inside the desktop
  content canvas without clipping names, scores, or three-letter team labels.

### Charts and dialogs

- Chart controls update the visualization, its plain-language description,
  and its screen-reader table together.
- Shareable chart state survives a copied URL and full refresh, including
  selected metrics, subjects, venue, window, and visible series when present.
- Playoff matchup dialogs open from the bracket, identify the selected series,
  switch among Overview, Games, Player Stats, and Advanced, and close by mouse
  and keyboard.

### Theme and accessibility

- Theme selection persists after reload and every control remains legible in
  both themes.
- Keyboard focus is visible, tab order follows the visual task order, and
  dialogs retain and restore focus appropriately.
- Controls do not rely on color alone, and unavailable or missing information
  is explained rather than displayed as zero.

## Recording findings

Treat any blocked task, clipped control, unexplained empty state, lost URL
state, inaccessible control, or inconsistent navigation pattern as a release
regression. Fix it in the same focused pull request when it is caused by the
current work; otherwise record a concrete follow-up with the affected route,
viewport, reproduction steps, and expected behavior.
