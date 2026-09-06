# Scroll and navigation audit — September 6, 2026

This follow-up to the visual audit addresses all six navigation findings in PR
#150. It preserves URL filters and the existing analytical definitions.

## Findings and behavior

| Finding | Resolution |
| --- | --- |
| Refresh restored into a short loading shell, leaving readers near the top | Save reading position per browser-history entry and URL in session storage. Restore after visible streamed content and fonts are ready, waiting for enough document height. |
| Clear Filters jumped to the top while Apply stayed nearby | Both use the shared scroll policy. Form navigation anchors the current form so changes above it do not displace the controls. |
| Schedule selectors reloaded the document; day navigation jumped to the top | Season, team, and date selections use client navigation. Day/week links retain local position. History restores selector values; the calendar month follows the selected date. |
| Draft pagination lost its results anchor; advanced pagination stayed at the bottom | Wait for the new results before placing their beginning 16px below the viewport top and moving keyboard focus there. Advanced pagination creates history entries so Back undoes page changes. |
| Back to Results lost the originating list position | Restore the matching list URL, reading position, native disclosures, internal scroll offsets, and available keyboard focus. Browser Back/Forward use their own history-entry snapshots. |
| Lines/Pairings jumped to results while other tabs preserved position | Tabs retain context and keep their tab strip visible. Remove the special results fragment from the Lines/Pairings switch. |

## Shared rules

- New detail pages start at the top.
- Same-page filters and presentation controls preserve context.
- Explicit results links and pagination move to the requested results anchor.
- Tabs keep their strip visible while displaying the new content.
- Refresh, browser history, and explicit return links restore reading context.
- Manual scrolling or keyboard navigation cancels pending restoration.
- Positions are bounded to 100 records in session storage. Storage failure does
  not block navigation; same-document restoration still works in memory.
- If content becomes shorter, restoration is limited to the available height.
  A five-second recovery timeout releases restoration if content cannot resolve.

`ScrollNavigation` owns scrolling for `IntentLink`, shared GET navigation, and
client-only URL controls. Resolved pages render `NavigationComplete`; hidden
stream containers do not count as ready. New route content must include this
marker, and new imperative URL changes should call `prepareScrollNavigation`
before mutating history or invoking the router. Raw external links and modified
clicks retain their normal browser behavior.

## Validation

With the populated local database and app running, execute:

```bash
SPORTSBALL_E2E_BASE_URL=http://localhost:3000 \
  npx --prefix apps/web playwright test \
  --config apps/web/playwright.config.ts e2e/scroll-navigation.spec.ts
```

The suite covers all six findings at 390px and 1280px, refresh on three different
page types, keyboard focus after pagination, schedule document identity, and
unavailable session storage. Run `make web-check` and the existing browser
regressions as well. Production-build verification matters because streamed
loading behavior differs from a warm development route.

Completed validation: `make web-check` passed (262 tests; 16 opt-in database
checks skipped), 94 development-browser checks passed, and all 34 production
navigation/performance checks passed. The new navigation suite contributes 19
checks. Mobile pagination and tab-switch screenshots were inspected as well.
