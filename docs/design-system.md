# Sportsball interface

The interface is a clean sports reference site. Light is the first-visit default;
saved dark preferences remain supported. Primary navigation is Games, Standings,
Teams, Players. Basic and Advanced Stats are adjacent views in Teams and Players.

Use semantic colors from `apps/web/src/styles/tokens.css`: white surfaces and a
soft gray canvas in light mode, graphite surfaces in dark mode, restrained blue
selection accents. Keep theme switching accessible and persistent.

The root stylesheet imports shared and feature rules in a deliberate cascade.
`reference.css` contains the current reference-site treatment; feature styles
provide layouts and chart geometry. Preserve the cascade when consolidating CSS.

Use familiar sans-serif typography, tabular numbers, and quiet table separators.
Statistics tables generally use 16px text. Team directory basic/advanced tables
share compact 13px type (11px at narrower desktop widths) so their columns fit.
Do not apply that density globally on desktop. Phone tables use 13px text,
compact rows, sticky identities, and contained horizontal scrolling. Keep tabs
and filters visible instead of adding column-group selectors. Team names may
use abbreviations on phones, with full accessible link names. Player names never wrap. Identity columns
align left; numeric headers and cells share alignment. Highlight the active sort.

Prefer useful tables over decorative summary cards or redundant headings.
Controls have visible labels and consistent sizing; filters update immediately.
Same-page sorting/filtering should preserve scroll position. Keep all four
primary destinations reachable on phones. Horizontal table overflow, where
needed, stays inside the table rather than widening the document.

Game tabs are separated from the scoreboard. Scoring and Game Flow do not repeat
the active tab's heading. Box Score and Lines use selectors instead of stacked
sections. Heatmaps use light ice in both themes and a shared game-wide scale;
color represents smoothed xG density, not shot counts alone.

Inspect populated desktop/mobile layouts and both themes when finalizing visual
changes. See [regression checklist](desktop-ux-regression.md).
