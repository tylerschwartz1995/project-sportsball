# Advanced analytics presentation

The first MoneyPuck website slice exposes season-level team, skater, and goalie
metrics through server-only TypeScript queries and renders them on existing team
and player detail pages.

## Routes

- `/teams/{nhlTeamId}?season={seasonId}` displays team situation splits.
- `/players/{nhlPlayerId}?season={seasonId}` displays player-team situation
  splits for skaters or goalies.

The React Server Components query PostgreSQL directly. No browser request or
page render calls MoneyPuck, and the normalized source records remain separate
from traditional NHL statistics.

## Current metrics

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

Rows retain MoneyPuck's published situations: all situations, 5-on-5, 5-on-4,
4-on-5, and other. Player records remain split by team so traded-player context
is not lost.

## Coverage and attribution

Season-summary coverage begins in 2008–09. Earlier team and player pages show an
explicit coverage message instead of treating missing data as zero.

Every advanced section links to and credits MoneyPuck.com. Metric definitions
are displayed with the results so on-ice percentages are not confused with
individual production.

## Remaining presentation work

- game-level team, skater, and goalie advanced views;
- shot maps and expected-goal event views;
- forward-line and defensive-pairing views;
- cross-season advanced leaderboards and comparisons;
- richer metric documentation and visualization.
