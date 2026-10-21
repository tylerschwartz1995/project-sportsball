# Interface regression checklist

Before publishing a broad UI change, run `make web-check` and the fixture
browser suite described in [Web development](../apps/web/README.md). Inspect
1280×720 desktop and narrow phone layouts in both themes using populated data.

- Navigation reads Games, Standings, Teams, Players; Home opens Games.
- Team basic and advanced columns align consistently and use matching type sizes.
- Names stay on one line; numeric values use tabular numerals; sort headers
  align with their cells and highlight only the sorted column.
- Season, phase, filters, sorting, refresh, and browser history agree with URL state.
- Same-page filters and sorts retain scroll position, especially Minimum TOI.
- Standings Conference/Division shows one selected group rather than stacked tables.
- Game tabs have space below the scoreboard; Box Score switches one team/type at a time.
- Game Flow switches modes; heatmaps share a scale, and goal dialogs close with Escape.
- Team identities and links work; no broken or clipped logos or document-wide overflow.
- Missing coverage displays dashes or an accurate empty state, never invented zeroes.
- Controls have labels, visible focus, usable touch targets, and legible contrast.

The fixture suite covers deterministic navigation and private access at desktop
and phone sizes. It does not replace visual review of fully populated charts or
establish hosted latency. Record any remaining regression with route, viewport,
steps, and expected behavior.
