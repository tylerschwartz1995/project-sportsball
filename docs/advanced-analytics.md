# Advanced analytics presentation

> Current product scope is defined by [App simplification](app-simplification.md).
> The feature inventory below records the broader pre-simplification app; retired
> features are not commitments to restore them.

The MoneyPuck website layer exposes season-level team, skater, and goalie
metrics plus game-level team, player, shot, line, and pairing records through
server-only TypeScript queries.

## Routes

- `/analytics?season={seasonId}&type={teams|skaters|goalies}` displays
  league-wide advanced leaderboards with situation and qualifying-ice-time
  controls.
- `/analytics/guide?season={seasonId}` provides the shared plain-language
  reference for advanced metrics. Definitions have no season filter; the
  optional season parameter preserves context for navigation back to analytics.
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

- an interactive team results-versus-process scatterplot that compares
  five-on-five expected-goal share with regular-season points percentage or
  playoff win percentage;
- selectable five-on-five xG, Corsi, and Fenwick process measures plus direct
  two-team comparison across results and every available process metric;
- quadrant filters for strong, outperforming, underperforming, and struggling
  teams, with fixed axes and exact-value tooltips;
- skater expected-versus-actual scoring rates with forward/defense filters and
  a finishing distribution around expectation;
- goalie expected-workload versus goals-saved-above-expected rates with
  positive/negative performance filters and a GSAx distribution;
- independent horizontal- and vertical-axis selectors covering scoring,
  possession, shot quality, workload, and goalie results, with distributions
  that follow the selected vertical metric;
- direct two-player comparisons across every available plot metric, games, and
  minutes for the current qualifying population;
- team xG%, Corsi%, Fenwick%, expected goals per 60 minutes, and high-danger expected goals
  for/against per 60 minutes in the selected situation (total × 3,600 ÷ ice-time
  seconds), plus high-danger expected-goal share. Zero or missing ice time
  displays as an em dash. HD xG% is HD xGF divided
  by HD xGF + HD xGA; missing inputs or a zero denominator display as an em
  dash. Regular-season values come from stored MoneyPuck season metrics;
  playoff totals aggregate the selected phase’s game records and remain
  missing when any contributing high-danger value is missing;
- skater GP, TOI, P/60, ixG/60, CF%, on-ice xGF/60 and xGA/60, xG%,
  and on-ice high-danger xG%. Rates use ice time in the selected situation;
  missing inputs and zero denominators display as an em dash. The skater
  leaderboard applies player-name and position filters before selecting up to
  200 rows by P/60 for client-side sorting;
- goalie GSAx/60, xGA/60, high-, medium-, and low-danger GSAx totals,
  and rebounds per 60 minutes;
- all-situations, five-on-five, power-play, and penalty-kill filters;
- explicit minimum-ice-time thresholds for skaters and goalies;
- sortable tables with links to supporting team and player profiles;
- a single all-columns table without column presets;
- plain-language metric definitions on hover or keyboard focus, a visible link
  to the Metric Guide, and a sticky identity column for wide tables.
- URL-backed plot metrics, groups, axes, and direct team/player selections,
  with a copy-link action that restores the exact analytical view.

The league leaderboards and centralized guide use the shared Modern Stats
Exploration hierarchy, semantic filters, table shells, and section navigation.
Tables and Charts are separate choices; distributions and direct-comparison
controls are optional. The team plot stays five-on-five independently of the
leaderboard situation selector. See the [design system](design-system.md) for
the current palette and interaction rules.

Teams, Skaters, Goalies, Lines & Pairings, and the Metric Guide share one
persistent section selector. The links use full document navigation so large
server-rendered leaderboards cannot leave the active tab and displayed dataset
out of sync.

League skater and goalie tables retain player-team splits rather than silently
combining traded-player rows. They show at most 200 qualifying rows for the
selected view: skaters are selected by P/60 and goalies by GSAx/60. Alternate
table sorts and plots operate within that capped player-team population.

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

- interactive Game Flow in the scoring timeline, with a default five-minute
  chance-quality pressure view, an optional cumulative expected-goal view,
  goal context, and period-level expected-goal totals;
- all-situations expected-goal cards and sortable team situation comparisons;
- normalized regulation-scale attacking half-rink shot maps, with circle size
  representing expected goal probability; every marker can be selected by
  pointer or with roving arrow-key, Home, and End controls to reveal its
  shooter, result, time, goalie, shot type, distance, score, and contextual
  tags. Attempts without source coordinates are counted but disclosed as not
  plotted. Period, result, and shooter filters are URL-backed, and per-team
  attempt lists allow selection of overlapping events;
- sortable all-situations skater and goalie advanced results;
- sortable five-on-five forward-line and defensive-pairing tables.

Completed playoff series open into a tabbed series dashboard. The overview
combines official results with team analytics aggregated from the stored
MoneyPuck team-game rows across only that matchup. All-situations and
five-on-five expected-goal shares are calculated from summed expected goals
for and against, while shot-attempt share is calculated from summed attempts
rather than averaged game percentages.

The Player Stats tab exposes complete official skater and goalie series totals.
The Advanced Analytics tab derives individual shooting and goaltending results
from MoneyPuck's playoff shot model, including individual expected goals,
goals above expected, goals saved above expected, and expected save percentage.
MoneyPuck player-game and line-combination files are regular-season only, so
the series view does not present unavailable playoff on-ice or line metrics.

The line-ranking page and team pages display Polars-derived season aggregates.
Player combinations are canonicalized before grouping, totals are summed across
games, and xG% and CF% are recomputed from those totals. The default league
threshold is 100 five-on-five minutes, with selectable thresholds to prevent
small samples from being presented as established top units.

Rows retain MoneyPuck's published situations: all situations, 5-on-5, 5-on-4,
4-on-5, and other. Player records remain split by team so traded-player context
is not lost.

The homepage includes top-five all-situations season Game Score and GSAx lists
alongside official scoring leaders. Advanced lists preserve player-team splits;
workload and supporting expected-goal metrics are visible. Sorting applies only
to each displayed top-five sample.

## Coverage and attribution

Season-summary coverage begins in 2008–09. Shot maps begin in 2007–08. Team
game metrics begin in 2008–09 and cover regular season and playoffs; player
game and unit files are regular-season only. Pages show an explicit coverage
message instead of treating unavailable records as zero.

Every advanced section links to and credits MoneyPuck.com. Compact definitions
beside the results link to the centralized metric guide, which explains how to
interpret shot-quality, possession, individual, on-ice, and goalie metrics.
Game Flow explicitly describes pressure as a backward-looking comparison of
modeled chance quality rather than momentum, betting odds, or a prediction of
the winner. Its plotted pressure trend uses a trailing 30-second time-weighted
average for readability, while interactive details preserve the exact
unsmoothed five-minute values. Both chart views use game-relative vertical
scales. Its coverage follows the MoneyPuck shot archive beginning in 2007–08,
and shootout attempts are excluded.

## Future analytics presentation

- cross-season advanced comparisons;
- named saved comparison collections (shareable plot URLs already exist);
- additional shot filters beyond the implemented period, result, and shooter;
- score-state and venue line-combination splits (10/20/40-team-game rolling
  rankings already exist).

### Simplified goalie leaderboard

The goalie directory shows Goalie, GP, TOI, GSAx/60, xGA/60, HD GSAx,
MD GSAx, LD GSAx, and Rebounds/60. It defaults to GSAx/60 descending,
all situations, and no minimum ice time. Selection before the 200-row cap
also uses GSAx/60. Danger-band GSAx values are season totals calculated
from the corresponding MoneyPuck expected goals minus actual goals allowed.
Rates use unrounded ice time in seconds: value × 3600 / seconds. Missing
inputs and rates with zero ice time display as unavailable, not zero.
Rebounds reflect workload as well as rebound control.

Player profile career tables combine historical NHL season summaries with
current normalized season fields. Advanced values are loaded in one grouped
career query: skaters use 5-on-5 points and individual expected goals per 60
plus on-ice xGF / (xGF + xGA); goalies use all-situations GSAx/60 and xGA/60.
Team splits are summed before division, null inputs remain unavailable, and
no regular-season advanced values are attached to playoff rows.

The player career table keeps a fixed Career Total footer for the selected
phase. Counting stats require complete season coverage. Rates are recomputed
from summed raw numerators and denominators, including 5-on-5 seconds for
skater rates and all-situations seconds for goalie rates. Missing inputs in
any season produce an unavailable total rather than a partial career value.
