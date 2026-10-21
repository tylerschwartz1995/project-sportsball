# Current app scope

Reviewed October 21, 2026. Primary navigation is Games, Standings, Teams, and
Players. Home redirects to Games. Light is the first-visit theme; saved dark
preferences remain supported.

The basic goalie directory orders columns as Goalie, GP, W, L, OTL,
SV%, GAA, and SO. GAA uses goals against × 3600 / actual ice-time seconds;
SO sums official team splits only when all splits report the value.

Goalie views display games played (GP) without a separate games-started (GS) column.

Player profiles now open a single season-history table with the newest season
first and a regular-season/playoff switch. The header contains identity and
a single-line biography. There are no separate profile stats tabs, season
picker, summary cards, or season/game-log links. Skater rows combine basic
production with 5-on-5 P/60, ixG/60, and xG%; goalie rows add all-situations
GSAx/60 and xGA/60. Advanced data is regular-season only, with unavailable
values shown as dashes. Multi-team rates are computed from summed counts
and ice time rather than averaging team rates.

The Games directory uses season and date controls only. It shows all teams
and game types on the selected date; old team and phase URL parameters no
longer restrict its calendar or results.

Game detail uses a compact two-row scoreboard with date and result status
above it. Scoring summaries order period, time, team, scorer, assists, score,
and goal type; scores show away–home order and goal-type abbreviations have
hover definitions.

Game box scores use Team and Player Type selectors with URL-backed state,
showing one skater or goalie table at a time. Redundant team/box-score
headings and stacked team sections are removed.

Game box scores include sortable all-situations advanced metrics alongside the
traditional totals: ixG, on-ice FF%, and on-ice xG% for skaters; xGA and GSAx for
goalies. Values match the player and team for that game. GSAx uses MoneyPuck xGA
minus MoneyPuck goals against, and unavailable metrics display an em dash.

Game detail tabs are Scoring, Box Score, Game Flow, Team Stats, Shot Map, and
Lines. Nested analytics navigation, summary cards, duplicate player views, and
long definitions are removed. Old advanced-view links map to the new tabs.

Team Stats always compares all-situations totals, ordered as Shots, Shot
Attempts, FF%, Expected Goals, High-Danger xG, Goals Above Expected, Faceoff %,
Hits, Blocked Shots, and Penalty Minutes. Mixed-unit rows are not sortable.
Goals Above Expected uses MoneyPuck goals minus xG. Faceoff share uses recorded
faceoff winners. Hits, blocks, and PIM sum skater box scores; PIM excludes goalie
and bench penalties. Power Play is omitted because opportunities are not stored.

Game Lines uses Team, Line Type, and Minimum TOI selectors. Its compact sortable
table shows Players, TOI, GF, GA, xGF, xGA, xG%, and FF%. Filtering preserves
space below the controls so shorter results do not pull the page upward.

Shot Map shows both teams side by side (stacked on mobile), without filters.
The xG-weighted heatmaps share one game-wide intensity scale. A five-foot
Gaussian kernel smooths modeled shot xG on a fixed grid clipped to the rink.
Missing coordinates or xG do not contribute. Off-white ice and a sequential
purple/orange/yellow palette work in both themes. Small puck icons mark goals
and open a dismissible details dialog without resizing the chart. Header
totals include modeled attempts, shots on goal, goals, and xG.

Primary navigation is ordered Games, Standings, Teams, and Players. Games is the default landing page. Standings
uses official regular-season snapshots, sortable tables, and clickable teams.

Standings focuses on Rank, Team, GP, W, L, OTL, PTS, PTS%, RW, Home, and Away,
with points as the default sort. Home/Away records use W–L–OTL and sort by
venue points percentage; they are hidden on narrow screens. Records are derived
from completed local regular-season games through the official snapshot date
and shown only when the combined game count and W–L–OTL match the snapshot.
Missing or mismatched coverage displays a dash.

The Teams basic table shows GP, GF, GA, DIFF, SF, SA, S%, SV%, PP%, PK%, FO%, PIM, and Hits,
ordered alphabetically by team name by default. Goals and shots are season totals. The advanced table shows GP, xGF/60, xGA/60, xG%,
CF%, FF%, HD xG%, and PDO, ordered by xG%. PDO is 100 times the sum of shooting
and save fractions, using MoneyPuck goals and shots from the selected situation
and phase. Playoff PDO uses summed counts, with missing or zero-denominator
inputs displayed as unavailable.

Conference and Division standings show one group at a time, chosen with a
selector above the table. The selection is stored in the URL and retained when
changing seasons if that group exists; otherwise the first available group is used.

Team S% uses summed skater goals and shots (excluding shootouts); SV% uses summed
goalie saves and shots faced (excluding empty-net goals). FO% uses recorded
faceoff wins divided by recorded draws, rather than averaging player percentages.
Hits and PIM sum box scores; PIM includes skaters and goalies but excludes bench
penalties, as noted in its tooltip. These additional metrics require game coverage
matching season GP, otherwise they display a dash. Matching game counts do not
guarantee every play-by-play event or individual player row is present.

Upcoming games in the Games directory show matchup and start-time information
without a preview link. Live and completed games retain links to game details.

Main navigation and Basic/Advanced stats links preload their inactive destinations
in production. Shared reads coalesce simultaneous requests with identical arguments;
entries are removed on completion or failure, preserving existing cache freshness
and invalidation. Development-mode first-visit compilation remains separate from
production navigation performance.

## Cleanup boundary

Retired homepage dashboards, comparison builders, draft/history/playoff research
workspaces, standalone line rankings, their private APIs, charts, query wrappers,
and tests have been removed. Retired page URLs retain lightweight redirects. The all-time player search and
metric guide remain linked supporting pages. Team
and player game-log URLs remain supported. Database tables, migrations, raw
artifacts, ingestion commands, and descriptive builds remain intact pending a
separate database dependency review. Removal from navigation alone is not proof
that stored data is disposable.

The deployed stack is Vercel, Neon, GitHub Actions, and private S3. The unapplied
Lightsail/CodeBuild server proposal has been removed. AWS bootstrap state storage
and hosted archive/backup infrastructure remain supported.
