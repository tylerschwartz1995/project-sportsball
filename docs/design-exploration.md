# Visual direction exploration

The temporary `/design-lab` route compares three candidate application systems
using the same Colorado Avalanche season and NHL standings data. It is
intentionally separate from the production routes so a visual direction can be
selected before the system is propagated through the application. The lab can
switch every concept between a league-home view and a team-profile view.

## Candidate directions

1. **Data Workspace** — compact analytics software with a persistent sidebar,
   workspace tabs, high-density controls, and utility-first tables.
2. **Sports Publication** — a reading-led product with a masthead, editorial
   hierarchy, broad whitespace, restrained rules, and narrative statistics.
3. **Broadcast Product** — a high-energy sports experience with a live ticker,
   full-width team moments, bold score graphics, and horizontal content rails.

These are different information and navigation architectures, not alternate
skins for one card layout. The comparison also includes light and dark previews.
Both preview controls are local to the design lab; production navigation and
theme persistence will be implemented only after a direction is selected.

## Team identity

All candidates demonstrate the same controlled team palette. Team colors may
be used for:

- identity marks and hero treatments;
- selected metrics and active states;
- plot series and comparison highlights;
- small contextual accents.

Team colors must not replace semantic colors for page backgrounds, body text,
table borders, positive/negative states, or keyboard focus. The production
implementation should use an audited team-palette registry rather than colors
embedded directly in individual pages.

## Theme implementation after selection

The chosen direction will add application-wide semantic light and dark tokens,
a header toggle, operating-system preference as the initial default, local
preference persistence, and a pre-render theme bootstrap that prevents a
wrong-theme flash.

## Plotting milestone

Plots begin immediately after the selected design and theme system are promoted
to production. The first chart slice will define shared color, typography,
tooltip, axis, responsive, and accessible-summary rules, then add:

1. rolling team form and goals/expected-goals trends;
2. player rolling production trends;
3. league comparison scatterplots and distribution views.

Shot maps remain the existing sport-specific spatial visualization and will be
adapted to the selected light/dark and team-color tokens at the same time.
