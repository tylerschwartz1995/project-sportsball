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
- Schedule controls share a row: season and a dated calendar button. On phones,
  the month calendar replaces the native date input; previous/next week links
  remain available.
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

## Follow-up spacing and sizing pass

A second inspection found accumulated margins around headers and filters, clipped
player names, hidden game tabs, and game-log metadata consuming the phone width.
The follow-up keeps the compact tables and makes these adjustments below 768px:

- Page titles and season selectors align on one row. The season label remains
  accessible without consuming a separate visible line. Team and game-log
  headers place the selector alongside the identity, wrapping long names.
- Filters keep 44px controls with consistent label spacing; empty action areas
  no longer add a blank row. Basic goalie search and player type share a row.
- All six game views appear in a full-width, two-row selector. Other navigation
  strips remain horizontal. Game chart height is reduced to 230px, and small
  scoring-event details use 12px text.
- Player names wrap within the sticky identity cell instead of being clipped.
  Logo stacks leave a clear gap before the name.
- Standings group selection sits on one compact row; the table does not repeat
  the group heading on phones.
- Game logs use shorter dates, put `vs`/`@` with the opponent, and omit the
  redundant phase and venue columns on phones. Player team abbreviations remain
  available, including for traded players. Full dates remain accessible. Desktop
  retains the original columns.

This follow-up was inspected in Chrome at 320, 390, and 430 CSS pixels, plus a
wider layout, in dark and light themes. The pass covered games, all six game
views, skater/goalie box scores, charts, standings groupings, team basic/advanced
stats, team profile tabs, player basic/advanced stats, skater/goalie profiles,
game logs, search, metric guide, and login. Local account settings remain
unavailable because passkeys are disabled locally. The existing physical-device
and authentication limitations still apply.

Browser smoke coverage now also guards the first-screen table position, season
control touch height, and visibility of every game-view option without horizontal
scrolling. No statistic calculations, database queries, or authentication settings
changed.


## Calendar and typography follow-up

A physical iPhone screenshot exposed overlapping native date and calendar
controls. Phones now use one dated calendar button beside the season selector,
with separate grid columns and a 44px target. Choosing a date closes the month
calendar. Desktop retains its native date input. Month and week navigation have
44px targets.

The sizing audit found 16px desktop link text leaking into 13px table cells.
Mobile table links now inherit the cell size, including player names and team
schedule links. Supporting labels, chart captions, and metadata previously set
to 10–11px are now 12px. Numeric rows remain 13px, navigation is 13–14px,
form inputs remain 16px, and headings retain their larger hierarchy.

Team schedules now fit all four visible columns at 320px: dates and opponents
use compact labels, times can wrap, and upcoming result cells show a dash
(with the full status accessible). All four team-profile tabs fit without
horizontal scrolling. Upcoming game cards put start time beside status and omit
the duplicate footer on phones.

Inspected the primary directories, standings groupings, team-profile tabs,
player/goalie directories and careers, game logs, all six game views, search,
metric guide, and login. Targeted calendar and schedule checks used 320, 390,
and 430 CSS pixels and both themes. Desktop is checked separately. Inspection
uses Chrome responsive tooling, not physical Safari; the supplied iPhone image
is the evidence for the original overlap. Account/passkey screens retain the
previously documented local-access limitation.

Browser regression coverage checks calendar containment and separation at three
phone widths, open/select/close behavior, and inherited player-link font size.


## Physical screenshot control and totals corrections

Follow-up iPhone screenshots identified uneven schedule control alignment,
oversized game-detail filters, and a career footer with a different column
structure. On phones, schedule labels now share 12px typography and aligned
baselines. The season and date controls use centered 14px values, matching
weight, color, corners, and 44px heights. The schedule heading gap is reduced.
Game-detail filters use 12px labels and 14px selected values with 44px targets;
text-entry fields retain their existing sizes.

Career totals now have separate Season and Team cells, matching the header and
body. The total label wraps on phones and sticks within only the Season column
when swiping. Statistic calculations are unchanged. Regression coverage compares
footer/body column bounds and schedule control styles, and checks filter sizes.

Inspected locally in Chrome at 320, 390, and 430 CSS pixels, in light and dark
themes, with desktop checks. Calendar open/select/close behavior was exercised.
These are responsive browser checks; physical iPhone Safari verification remains
with the user.
