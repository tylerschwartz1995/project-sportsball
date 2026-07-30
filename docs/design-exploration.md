# Visual direction exploration

The temporary `/design-lab` route compares three candidate directions using the
same Colorado Avalanche season data. It is intentionally separate from the
production routes so a visual direction can be selected before the system is
propagated through the application.

## Candidate directions

1. **Data Lab** — compact, technical, and optimized for dense analytical use.
2. **Modern Broadcast** — energetic, team-forward, and built around large
   records and strong sports hierarchy.
3. **Sports Editorial** — spacious, typographic, and closer to a data-rich
   sports publication.

The comparison includes light and dark previews. The preview toggle is local to
the design lab; production theme persistence will be implemented only after a
direction is selected.

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
