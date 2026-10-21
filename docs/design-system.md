# Sportsball interface

The current direction is a light, clean sports reference interface. Teams,
Players, and Games are the three primary destinations. Basic and advanced
statistics are adjacent views within Teams and Players. Completed games keep
scoring, box scores, and shot quality (including shot maps).

## Appearance

Use white surfaces on a soft gray canvas, dark navy text, and restrained blue
for selected controls and links. Light is the first-visit default; preserve an
explicit saved dark preference. Both themes use semantic tokens in
`apps/web/src/styles/tokens.css`.

The shared interface rules live in `apps/web/src/styles/reference.css`, loaded
after legacy feature styles. Feature styles still supply chart geometry and
specialized layouts. As those features are edited, consolidate superseded
rules rather than introducing another visual layer.

Use familiar sans-serif typography and clear page titles. Default body text,
navigation, and form values are 16px; table values are 15px; column headings,
filter labels, and source notes are 14px. Keep numbers tabular. Avoid decorative panels, large dashboard cards,
and explanations that repeat nearby labels.

## Navigation and controls

Keep Teams, Players, and Games visible, including on phones. Use one header
row on desktop and a dedicated navigation row on phones. Basic/Advanced tabs
and the regular-season/playoff control should sit together above the results.
Season changes and phase navigation retain their URL context.

Group player search, player type, and position in one toolbar. Keep labels
visible. Basic and advanced stats filters update results automatically; text
search waits briefly after typing. Do not show an Apply Filters button or
unapplied-changes message.
Games retain season, phase, team, and date selection plus the week/calendar
navigator. Controls must not overlap at narrow widths.

## Tables and details

Always show all columns. Use horizontal scrolling when needed, subtle row
separators, quiet column headings, and a visible sort direction. Preserve
keyboard sorting and metric explanations. Keep entity names readable and
clickable, using team logos as recognition aids. Basic and advanced tables share
the same identity components, row padding, sans-serif headings, accent color,
and sticky name-column behavior. Do not add a vertical divider to one view or
a separate grouped header band to the advanced team table. Player-type selection
uses the same labeled dropdown in both basic and advanced filter bars. Missing values are not zero.

Apply the same palette, typography, borders, and navigation treatment to team
and player profiles, game cards, completed-game scoreboards, and shot quality.
Source and coverage notes stay available below the data.

## Review

Inspect desktop and phone layouts with real local data. Check tab contrast,
filter wrapping, table scrolling, and both themes. During the local design
review, defer the automated suite and Git publishing until Tyler requests
finalization. Merging always requires Tyler's explicit approval.

Stats tables use 16px headers, sortable header controls, player names, and
numeric values across desktop and mobile. Secondary position labels remain
smaller. Wide tables scroll horizontally rather than reducing text size.
