# Desktop UX regression checklist

Use this checklist after a user-facing web change and before merging a broad UI
release. The baseline viewport is 1280 by 720 pixels with the horizontal
primary navigation visible. Wider desktop checks are useful, but they do not replace this
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

- Clearing player birthplace filters clears the visible controls and the next
  submission. Browser Back restores both season labels and data.
- Historical five-season peaks retain their window after Apply/Clear. Draft
  year changes retain compatible rounds and remove unavailable ones.
- Current chart metrics and venue survive adjacent context links and resets.
- Multi-field edits show a pending message until applied; all controls show
  keyboard focus. Use `e2e/filter-consistency.spec.ts` for the repeatable pass.

### Tables and long results

- Numeric columns sort in both directions with an accessible active header
  state. Check URL persistence where supported. Player-directory and historical
  sorts apply before server pagination; advanced sorts retain their stated caps.
- Essential/All controls retain identity and explain unfamiliar metrics where
  offered. League analytics and season combinations show all columns.
- Paginated results expose their supported sizes, current range, navigation,
  and stable URL state. Do not assume every route offers 25/50/100 rows: the
  player directory uses 50 and historical rankings use 25.
- Sticky headers and identity columns remain aligned while a table scrolls.

### Navigation and information hierarchy

- Horizontal navigation marks the current destination. At phone widths, the
  Menu exposes Follow, Explore, and Research groups, Find a Player, and Lines
  & Pairings, and closes with Escape or selection.
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
