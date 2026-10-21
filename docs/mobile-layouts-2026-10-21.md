# Mobile layouts — October 21, 2026

## Revised approach

The initial phone redesign used stacked stat rows, a Columns selector, hidden
filters, and dropdowns in place of longer tab bars. That design was rejected:
it made comparisons harder and required extra taps. This revision removes those
controls and the client-side table regrouping code.

Reference inspection used the mobile websites for
[theScore NHL scores](https://www.thescore.com/nhl/events?source=league_menu_bar)
and [ESPN NHL standings](https://www.espn.com/nhl/standings). The useful patterns
were compact matchup rows, visible navigation, and a fixed team column beside
scrolling statistics. Native mobile apps were not inspected.

At widths up to 767 CSS pixels:

- Statistical tables retain real rows, 13px text, tabular numbers, and sorting.
  The identity column stays visible while additional metrics scroll inside the
  table. There is no column-group selector. Primary skater stats fit together
  at 390px; standings fit through points at 320px. Longer tables still require
  horizontal swiping. Full table schemas are preserved.
- Team tables use logos and abbreviations. Links retain full accessible team
  names. Long player names may truncate; their links still open the profile.
  Line combinations list each abbreviated player on a separate line.
- Tabs remain visible in a horizontal strip. The active tab scrolls into view.
  Filters remain directly accessible and retain URL state.
- Games use compact two-row scoreboards. Scoring events have a compact timeline
  arrangement retaining period, time, scorer, assists, team, score, and type.
- Team schedules fit date, abbreviated opponent with home/away indicator,
  result, and score/start on one row. Desktop retains full names and records.
- Schedule date controls share a row. Below 360px, the month calendar replaces
  the direct date input; previous/next week links remain available.
- Biographies wrap; game logs use compact recent-result strips. Heatmaps stack
  vertically and preserve rink proportions. Game Flow retains its narrow axes.

Basic goalie column order is GP, SV%, GAA, W, L, OTL, SO (plus GSAx/60 on team
profiles), so save performance is visible before the decision record. Statistic
calculations and database queries are unchanged.

## Browser inspection

Inspected the running local application in Chrome responsive view, accounting
for browser zoom. The main pass used 390 CSS pixels, with narrow-phone checks
at 320px, wider-phone checks at 430px, and tablet/desktop checks at 800/1280px.
Both light and dark themes were inspected.

| Surface | Views inspected |
| --- | --- |
| Players | Basic and advanced skaters/goalies, visible search and filters |
| Player profiles | Skater and goalie career tables; regular season and playoff history |
| Game logs | Skater, goalie, and team logs with compact recent results |
| Teams | Basic and advanced tables |
| Team detail | Schedule, skaters, goalies, forward lines, defensive pairs, advanced stats |
| Standings | League, conference, division |
| Games | Completed-game list, week controls, expanded calendar |
| Game detail | Scoring, box score, game flow, team stats, shot maps, lines |
| Game variants | Home goalie box score, defense pairs, minimum TOI, pressure and cumulative charts |
| Supporting pages | Player search, metric guide, email login, unavailable-page layout |

Changing game-line minimum TOI retained the reading position (194px before,
198px after) instead of jumping to the top. Browser observations cover routes
and representative view states, not every season, record, or filter combination.

## Limits

Local passkey support is disabled: `/account/security` returns the unavailable
page, and local login offers email only. Account settings and real passkey
sign-in were not visually verified. Authentication settings were not changed.
This is desktop Chrome responsive inspection, not a physical iOS/Android device
or screen-reader certification.

## Regression checks

Run lint, TypeScript, unit tests, and a production build before publishing.
The fixture browser smoke test checks visible filters, normal compact row
height, absence of the Columns selector, navigation, and page containment in
both themes. Recheck sticky identity cells, sorting, career totals, and the
767px breakpoint whenever table schemas or shared styles change.
