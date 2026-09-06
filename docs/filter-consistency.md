# Filter consistency

This records the filter fixes merged in PR #144 and their regression rules.
The September 2026 filter audit covered page filters, chart controls, context
navigation, disclosures, and adjacent sorting/pagination controls across the
app. The follow-up fixes preserve the existing statistical definitions and
coverage boundaries.

## Resolved findings

| Finding | Resolution |
| --- | --- |
| Clear left birthplace fields selected | Player forms remount when applied context changes; country, region, and city reset together. |
| Back showed the wrong season | The shared season select is keyed to the resolved season. |
| Draft year retained an invisible round | Unavailable rounds redirect to a URL without that round; compatible rounds survive year changes. |
| Applying five-season peak filters switched to three seasons | Apply and Clear retain the peak window. |
| Season keyboard focus was invisible | All form controls use the shared visible focus treatment. |
| Player season/phase lost refinements | Search, eligible minimums, birthplace, position, and sort survive context changes; pagination resets. |
| Chart state disappeared through neighboring links | Same-page context links and GET navigation read the current presentation parameters. Explicit presentation-tab changes still take precedence. |
| Historical and advanced selectors were not shareable | Record, league, decade, and advanced situation choices have independent URL parameters. |

The follow-up [scroll and navigation audit](scroll-navigation-audit-2026-09-06.md)
standardizes Apply/Clear, refresh, pagination, tabs, schedule controls, and return
navigation.

## Interaction and styling rules

- Season, phase, chart, and selection-only draft controls apply immediately.
  Player Type previews the appropriate skater or goalie fields and sort options;
  the results update with Apply Filters, together with the other form fields.
- Multi-field forms use Apply Filters and announce unapplied changes and loading.
  Clear Filters is available only for active refinements and preserves context.
  Draft board resets preserve sorting; draft range resets preserve the team.
- Shared CSS owns field height, radius, typography, colors, and focus. Controls
  are at least 44px tall; layouts remain owned by the containing component.
- Labels use consistent title capitalization and country names. Historical
  teams show full stored names with source abbreviations; missing modern club
  identities fall back to historical team-season names.
- Numeric helper text explains zero minimums and decimal save percentages.
  Dependent birthplace fields explain when a country must be chosen first.
- Filter and supplementary-content disclosures use the same chevron treatment.
  Draft Advanced Metrics has a full label touch target and a shareable state.

## Regression checks

Run `make web-check` and the database suite described in `AGENTS.md`. The query
change only enriches historical filter labels; it does not alter ranking
populations or historical team identity semantics.

With a populated local app running:

```bash
SPORTSBALL_E2E_BASE_URL=http://localhost:3000 \
  npx --prefix apps/web playwright test \
  --config apps/web/playwright.config.ts \
  e2e/filter-consistency.spec.ts e2e/audit.spec.ts \
  e2e/theme-contrast.spec.ts e2e/content-audit.spec.ts
```

The filter suite checks reset/reapply, browser history, incompatible and
compatible draft rounds, five-season peaks, context preservation, staged
player-type changes, pending form edits, statistical selector refresh, historical
team names, draft sorting/range reset, keyboard focus, and desktop/mobile fit in
both themes. Existing suites additionally cover chart history, schedule sizing,
contrast, and content availability. These are regression checks, not a guarantee
for every combination of historical data, operating system, or browser.
