# Advanced analytics presentation

The MoneyPuck website layer exposes season-level team, skater, and goalie
metrics plus game-level team, player, shot, line, and pairing records through
server-only TypeScript queries.

## Routes

- `/analytics?season={seasonId}&type={teams|skaters|goalies}` displays
  league-wide advanced leaderboards with situation and qualifying-ice-time
  controls.
- `/analytics/guide?season={seasonId}` provides the shared plain-language
  reference for every advanced metric used by the website.
- `/teams/{nhlTeamId}?season={seasonId}` displays team situation splits.
- `/players/{nhlPlayerId}?season={seasonId}` displays player-team situation
  splits for skaters or goalies.
- `/games/{nhlGameId}` displays advanced team and player results, shot maps,
  forward lines, and defensive pairings alongside the traditional box score.
- `/lines?season={seasonId}&minimum={minutes}` ranks season-level forward lines
  and defensive pairings.

The React Server Components query PostgreSQL directly. No browser request or
page render calls MoneyPuck, and the normalized source records remain separate
from traditional NHL statistics.

## Advanced game package

`getMoneyPuckGameAnalytics(nhlGameId)` is the server-only application boundary
for the game page. It performs six parameterized reads in parallel
and returns one serializable contract containing:

- historical game and team identity;
- team, skater, and goalie situation metrics;
- chronologically ordered modeled shots with coordinates and expected-goal
  context;
- forward lines and defensive pairings with canonical player identities.

An existing NHL game returns a package even when MoneyPuck does not cover that
season or game; its advanced record arrays are empty. An unknown NHL game
returns `null`. Player-game and line data are regular-season only, while team
game and shot data also cover playoffs.

## Current presentation

The league analytics route includes:

- team xG%, Corsi%, Fenwick%, expected goals, and actual goals;
- skater game score, on-ice xG% and Corsi%, individual expected goals, goals,
  and points;
- goalie goals saved above expected, expected/actual goals against, and
  expected/actual shots on goal;
- all-situations, five-on-five, power-play, and penalty-kill filters;
- explicit minimum-ice-time thresholds for skaters and goalies;
- sortable tables with links to supporting team and player profiles.

The league leaderboards and centralized guide use the shared Data Workspace
page hierarchy, semantic filters, compact metric cards, table shells, and
responsive section navigation. Advanced controls and highlights use the
secondary violet accent while retaining the same light/dark theme behavior as
traditional-stat routes.

Teams, Skaters, Goalies, Lines & Pairings, and the Metric Guide share one
persistent section selector. The links use full document navigation so large
server-rendered leaderboards cannot leave the active tab and displayed dataset
out of sync.

League skater and goalie tables retain player-team splits rather than silently
combining traded-player rows. They show at most 200 qualifying rows for the
selected view.

Team and skater views include:

- expected-goal share (`xG%`);
- Corsi share (`CF%`);
- Fenwick share (`FF%`);
- expected goals for and against;
- player individual expected goals, goals, points, and game score.

Goalie views include:

- expected and actual goals against;
- expected and actual shots on goal against;
- goals saved above expected (`xGA - GA`).

Game pages add:

- all-situations expected-goal cards and sortable team situation comparisons;
- normalized offensive-zone shot maps, with circle size representing expected
  goal probability; every marker can be selected by pointer or keyboard to
  reveal its shooter, result, time, goalie, shot type, distance, score, and
  contextual tags;
- sortable all-situations skater and goalie advanced results;
- sortable five-on-five forward-line and defensive-pairing tables.

The line-ranking page and team pages display Polars-derived season aggregates.
Player combinations are canonicalized before grouping, totals are summed across
games, and xG% and CF% are recomputed from those totals. The default league
threshold is 100 five-on-five minutes, with selectable thresholds to prevent
small samples from being presented as established top units.

Rows retain MoneyPuck's published situations: all situations, 5-on-5, 5-on-4,
4-on-5, and other. Player records remain split by team so traded-player context
is not lost.

## Coverage and attribution

Season-summary coverage begins in 2008–09. Shot maps begin in 2007–08. Team
game metrics begin in 2008–09 and cover regular season and playoffs; player
game and unit files are regular-season only. Pages show an explicit coverage
message instead of treating unavailable records as zero.

Every advanced section links to and credits MoneyPuck.com. Compact definitions
beside the results link to the centralized metric guide, which explains how to
interpret shot-quality, possession, individual, on-ice, and goalie metrics.

## Future analytics presentation

- cross-season advanced comparisons;
- richer filters and shot-map filtering.
- rolling-window and score-state line-combination splits.
