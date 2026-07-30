# Sportsball visual design system

This document defines the initial production visual direction introduced with
the team profile reference page. The system is deliberately sport-neutral so a
future basketball, baseball, or football section can reuse the same application
shell and data components without looking like a hockey reskin.

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
  for comparable statistics.
- **Shape:** 16-pixel primary panel radius and 12-pixel nested-control radius.
- **Spacing:** sections use a 48-pixel desktop rhythm, compressing naturally on
  small screens.

The canonical CSS tokens live in `apps/web/src/app/globals.css`. Reusable React
primitives live in `apps/web/src/app/_components/ui-primitives.tsx`.

## Information hierarchy

Every detail page should follow the same sequence:

1. identity and current context;
2. a compact set of decision-useful headline statistics;
3. primary raw data;
4. derived or model-based analytics;
5. specialized breakdowns and exploration links.

Traditional statistics use cyan accents. Advanced statistics use violet accents
and retain provider attribution and definition links.

## Data components

- Section headings contain one eyebrow, one descriptive title, optional
  explanatory copy, and no more than one primary action.
- Metric tiles use a short label, a dominant tabular value, and optional context.
- Table shells provide one consistent border, background, radius, and scrolling
  boundary. Numeric columns remain sortable and right-aligned.
- Missing values display an em dash. Missing datasets use an explanatory state
  rather than a zero.

## Responsive and accessibility rules

- Touch targets should be at least 40 pixels tall wherever practical.
- Visible keyboard focus uses the primary cyan accent.
- Color never carries meaning without a label or value.
- Dense tables scroll horizontally rather than hiding columns or silently
  changing statistical grain.
- Page identity and headline metrics must remain understandable before a user
  scrolls on a phone.

## Rollout

The team profile is the reference implementation. Once approved, the same
tokens and primitives should be applied in this order:

1. standings and league overview;
2. game pages and timelines;
3. player profiles and directories;
4. advanced leaderboards and the metric guide;
5. final cross-route mobile and accessibility review.
