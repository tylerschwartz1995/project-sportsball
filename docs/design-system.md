# Sportsball visual design system

This document defines the selected Data Workspace production direction. The
system is deliberately sport-neutral so a future basketball, baseball, or
football section can reuse the same application shell and data components
without looking like a hockey reskin.

## Product character

Sportsball should feel analytical, credible, and energetic without resembling a
betting product or a generic enterprise dashboard. Dense data remains the main
content. Color, typography, and hierarchy help users understand it rather than
competing with it.

## Foundations

- **Canvas:** deep navy with a quiet grid and low-contrast cyan/violet ambient
  light.
- **Surfaces:** layered navy panels separated by restrained borders, not heavy
  shadows.
- **Primary accent:** cyan for navigation, traditional statistics, links, and
  active controls.
- **Secondary accent:** violet for model-based analytics and derived metrics.
- **State colors:** emerald for positive status and rose for negative results.
- **Typography:** Geist Sans for interface and reading; Geist Mono for compact
  labels, identifiers, and technical metadata. Tabular numerals are required
  for comparable statistics. The desktop root scale grows gradually from 18
  to 20 pixels as the viewport widens, so typography, controls, logos, and
  rem-based component geometry remain visually balanced on larger monitors.
- **Shape:** 16-pixel primary panel radius and 12-pixel nested-control radius.
- **Spacing:** page sections use a compact 32-pixel rhythm, compressing
  naturally on small screens so useful content remains close to its controls.

The canonical CSS tokens live in `apps/web/src/app/globals.css`. Reusable React
primitives live in `apps/web/src/app/_components/ui-primitives.tsx`.

## Information hierarchy

Every detail page should follow the same sequence:

1. identity and current context;
2. URL-backed tabs when the page contains distinct information modes;
3. only the content belonging to the selected tab;
4. supporting definitions and exploration links for that selected view.

Tabs are page views, not scroll shortcuts. They preserve season and phase
context, expose the active view with `aria-current`, and support browser
back/forward navigation. Closely related summaries and tables may remain
together; separate tasks such as a draft board, pick-value plot, and team
performance comparison should not be stacked into one long page.

Traditional statistics use cyan accents. Advanced statistics use violet accents
and retain provider attribution and definition links.

## Application shell

Desktop routes use a persistent left sidebar. Small screens use a compact,
horizontally scrollable top navigation so content retains the full screen
width. The shell owns sport context, primary navigation, data status, and the
theme control; pages own their season and dataset controls.

Light and dark modes use semantic tokens rather than separate component markup.
Muted text and accent links maintain at least WCAG AA text contrast against the
canvas, panels, and raised surfaces. Accent-filled controls use explicit
`--on-accent` tokens instead of assuming the canvas color is readable, and
positive, negative, and warning states keep semantic foreground tokens in both
themes. Light-mode form boundaries use the stronger `--control-border` token
so fields remain identifiable without relying on shadows.

Filters show their active defaults instead of presenting blank controls.
Numeric thresholds use `0` when no minimum is active, while select controls use
a clear `All …` or named default. Phase selectors keep their context in an
accessible label without repeating it beside self-explanatory options. Helper
text is reserved for information that is not already expressed by the adjacent
heading or field labels.
Dark is the first-visit default, an explicit selection persists on the device,
and a pre-render bootstrap applies it before the interface is painted.

## Data components

- Section headings contain one eyebrow, one descriptive title, optional
  explanatory copy, and no more than one primary action.
- Metric tiles use a short label, a dominant tabular value, and optional context.
- Desktop component width follows the amount of information being presented.
  Use the compact width for short leader, schedule, and two-entity comparison
  tables; use the standard width for standings and medium statistical tables;
  reserve the full page width for draft boards, brackets, and analytics tables
  whose column count genuinely requires it. Keep intentional
  whitespace outside compact data instead of expanding gaps between related
  values. The ordinary desktop canvas stops growing at 80rem so even wide data
  remains coherent on ultrawide monitors; exceptionally dense tables scroll
  inside that canvas rather than stretching indefinitely.
- Store the canvas and compact, standard, and data-width boundaries as shared
  CSS tokens. Width tiers scale with the desktop root size, preserving their
  information hierarchy while avoiding tiny content in a wide application
  shell. Do not add viewport-specific font overrides to individual pages.
- Column width follows meaning: ranks, logos, positions, dates, seasons, and
  numeric values remain content-sized and on one line. Primary team, player,
  matchup, and metric labels use a stable readable track instead of absorbing
  every unused pixel. Headings, filters, tabs, pagination, and notes align with
  the width of the data they control.
- Peer panels share the same column grid and vertical edges. Metric cards wrap
  into fewer columns before their labels or context become cramped; a
  low-control filter stays compact rather than inheriting a full form width.
- Related tab views keep the same outer width when their internal dataset
  changes; genuinely wide tables scroll inside that boundary. Selection-only
  schedule filters apply immediately instead of requiring a redundant View
  action.
- Historical discovery starts with curated records and contextual charts.
  Detailed season, eligibility, and player filters live in a disclosure below
  the entity and metric controls so the first viewport presents useful history
  rather than a large form. Filtered rankings, tabs, and pagination keep the
  same outer edges.
- Player overview facts and selected-season totals use a compact data-width
  block. Short profile facts remain information-sized, and season metrics use
  one dense desktop row instead of stretching sparse values across the canvas.
- Long statistical tables use tighter vertical cell padding without reducing
  the established application font size. Short schedules and comparisons keep
  their normal row rhythm.
- Related compact datasets of equal importance share an equal-width desktop
  row when shown together, then stack when the viewport can no longer support
  a readable side-by-side presentation.
- When one metric is derived directly from another comparison, combine them
  into one visual rather than repeating team identities across peer cards.
  Game expected-goal totals and xG share use one away-to-home comparison with
  centered, prominent team identities, exact values, a labeled differential,
  and a proportional bar aligned to the comparison content.
- Table shells provide one consistent border, background, radius, and scrolling
  boundary. Numeric columns remain sortable and centered beneath their column
  headings.
- Missing values display an em dash. Missing datasets use an explanatory state
  rather than a zero.

## Plot conventions

- Charts use semantic CSS tokens so the same component remains legible in light
  and dark modes. Cyan represents traditional results; violet represents
  derived or model-based measures.
- Axes use percentages or explicit units, restrained horizontal grid lines, and
  a labeled reference line when a meaningful baseline exists.
- When two series use materially different units, a color-matched axis appears
  on each side. Tooltips must repeat the full metric names and formatted units
  so the dual scale cannot be mistaken for a direct numerical comparison.
- Tooltips identify the date, subject, observed result, values, and rolling
  sample size. Color is never the only way to distinguish a series.
- Rolling charts aggregate the component totals inside each window instead of
  averaging already-calculated percentages. Early-season points use the games
  available so far and disclose the smaller sample.
- Plot filters are applied before the rolling calculation. Venue controls
  therefore compare true home-only or away-only rolling samples rather than
  hiding points from an all-games calculation. Series controls always keep at
  least one available line visible.
- Standings progression compares every team in one selected division. Current
  divisions show eight clubs; historical seasons preserve the division size
  that existed in that season. No separate team selector is shown.
- League comparison scatterplots use fixed axes while filtering so a subject
  never appears to move when its comparison group changes. Meaningful
  horizontal and vertical baselines define plain-language quadrants, and the
  legend explains both the color and interpretation of every group. A direct
  comparison attached to the plot shares its outer edges with that plot.
- Player comparison plots normalize counting metrics to per-60-minute rates
  before placing players with different workloads on the same axes.
  Distributions use the same fixed bins while filtering, with signed metrics
  centered on zero, so changes in shape reflect the selected population rather
  than a rescaled axis.
- Selectable-metric plots keep axis labels, tooltips, reference lines,
  distributions, and screen-reader tables synchronized with the current
  metric choices. Direct comparisons retain the same statistical grain and
  disclose player-team splits instead of silently combining them.
- Plot controls are an application-wide convention, not an advanced-analytics
  exception. Comparison plots expose interchangeable measures and direct
  subjects; time-series plots preserve time on the horizontal axis and expose
  window, venue, and series controls; spatial plots use event-level selection
  and contextual detail.
- Every interactive chart includes a plain-language description and a
  screen-reader table containing the same values.
- Charts should reveal change, comparison, or distribution. Static headline
  values remain text or tables rather than decorative plots.

## Responsive and accessibility rules

- Touch targets should be at least 40 pixels tall wherever practical.
- Visible keyboard focus uses the primary cyan accent.
- Color never carries meaning without a label or value.
- Dense tables scroll horizontally rather than hiding columns or silently
  changing statistical grain.
- Page identity and headline metrics must remain understandable before a user
  scrolls on a phone.

## Rollout

The local MVP rollout covers the league overview, standings, schedules, team
and player directories and profiles, games, timelines, box scores, analytics,
combinations, playoffs, drafts, history, comparisons, and global loading,
empty, error, and not-found states. Keyboard skip navigation, visible focus,
reduced-motion support, semantic chart alternatives, light/dark themes, and
horizontally scrollable dense tables establish the accessibility baseline.

Cross-device testing and accessibility review continue as normal product
maintenance rather than blocking the local MVP.
