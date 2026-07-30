# Visual direction decision

Sportsball uses the **Data Workspace** application system. It was selected
after a temporary local design lab compared three architectures with the same
Colorado Avalanche season and NHL standings data. The comparison route was
removed after the decision.

## Selected system

Data Workspace uses:

- persistent sidebar navigation on desktop and compact horizontal navigation on
  small screens;
- dense but legible tables and summary metrics;
- controls positioned near the data they affect;
- restrained cyan and violet semantic accents;
- team color as contextual identity rather than application chrome;
- light and dark themes backed by the same semantic tokens.

The rejected Sports Publication and Broadcast Product concepts were useful
comparisons but are not production targets.

## Team identity

Team colors may be used for:

- identity marks and hero treatments;
- selected metrics and active states;
- plot series and comparison highlights;
- small contextual accents.

Team colors must not replace semantic colors for page backgrounds, body text,
table borders, positive/negative states, or keyboard focus. Production should
use an audited team-palette registry rather than colors embedded directly in
individual pages.

## Theme implementation

The application shell provides semantic light and dark tokens, a persistent
toggle, dark mode as the first-visit default, local preference storage, and a
pre-render bootstrap that prevents a wrong-theme flash. Routes are being
migrated to native semantic components in controlled groups; a temporary
compatibility layer keeps remaining routes readable during rollout.

## Plotting milestone

Plots begin after the selected design and theme system are promoted. The first
chart slice will define shared color, typography, tooltip, axis, responsive,
and accessible-summary rules, then add:

1. rolling team form and goals/expected-goals trends;
2. player rolling production trends;
3. league comparison scatterplots and distribution views.

Shot maps remain the existing sport-specific spatial visualization and will be
adapted to the selected light/dark and team-color tokens at the same time.
