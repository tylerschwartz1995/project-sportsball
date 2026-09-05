# The Sportsball Record — styling exploration

This is a competing design on `agent/editorial-style-exploration`, branched from
`main`. **Do not merge this exploration into main.** It is a working alternative
for comparison, not a replacement of the selected production design.

## Direction

An independent sports statistics publication: a strong masthead, serif headlines,
quiet surfaces, and dense, ruled data. The front page leads with standings
movement and league trends; results, upcoming games, standings, and scoring
leaders follow. Existing data, qualifications, phase separation, sorting, URL
filters, and chart behavior are retained.

The visible name remains Sportsball. “The Sportsball Record” names this design
experiment, not a separate product or a claim of editorial reporting.

## References examined

- [Silver Bulletin](https://www.natesilver.net/): a distinctive central masthead,
  horizontal topic navigation, and an editorial hierarchy divided by fine rules.
  Adapt the publication structure, not its subscription interface or branding.
- [Dunks & Threes](https://dunksandthrees.com/teams): a quiet dark canvas, restrained
  horizontal navigation, and direct access to teams and statistical tools.
- [Cleaning the Glass](https://cleaningtheglass.com/): strong typographic identity,
  explanatory copy near statistics, and compact comparisons.
- [FanGraphs leaderboard interface](https://blogs.fangraphs.com/weve-updated-our-major-league-leaderboards-interface/):
  retain the depth of a research tool and its explicit filters rather than
  turning useful statistics into promotional cards.

## Design choices

- Charcoal/ivory dark theme and warm paper/ink light theme. Dark remains the first
  visit default; the existing preference persists across reloads.
- Copper denotes interactive and observed-statistic accents. Sage identifies
  derived measures; explicit labels continue to distinguish statistical meaning.
  Categorical plots retain distinct theme-specific series colors.
- Georgia headlines and masthead pair with the existing Geist statistical body
  and monospaced metadata. No additional font download or dependency is needed.
- The desktop sidebar becomes one horizontal navigation shared with mobile.
  On phones it scrolls, and the current section is automatically brought into
  view. Active links have a visible underline as well as color.
- Main sections use rules and open space instead of shadows, glowing backgrounds,
  or rounded cards. Form controls have crisp corners; tables retain their own
  scrolling boundaries and all statistical columns.
- A 16–18px base scale makes fuller use of the width recovered from the sidebar.
  Serif headlines establish hierarchy without inflating the statistical rows.
- A shared footer provides source context and access to the metric guide.

## Implementation and comparison

`apps/web/src/app/editorial.css` is loaded after the existing stylesheet. It owns
this direction's theme tokens, typography, masthead, control shapes, and section
presentation. The underlying layout and data styles remain available in
`globals.css`; some unused sidebar rules are intentionally retained to keep this
experiment easy to compare. Shared header markup and homepage section order are
also changed, so disabling the CSS import alone is not a complete rollback.

Run the normal local server on this branch:

```bash
SPORTSBALL_WEB_DATABASE_URL=postgresql://sportsball:sportsball@localhost:5432/sportsball \
  npm run dev --prefix apps/web
```

Compare home, standings, team/player profiles, analytics, and history in both
themes. The tradeoffs to evaluate are the space taken by the publication masthead,
the smaller statistical base size, and the loss of a permanently visible desktop
sidebar. Navigation remains at the top of the document rather than following
long tables as users scroll.

This is a presentation-only exploration. No deployment, database changes,
scheduled writes, or change of analytical definitions is included.

## Second pass: a stronger editorial composition

The front-page flag now spans most of the page width; inner pages use a compact
masthead so research views keep more room for their content. The front page is
an asymmetric form-guide/scoring-leader spread, followed by a four-column league
trends digest and the results desk. The leading scorer gets a typographic lead;
all five leaders still link to profiles and retain their exact totals.

Team and player identities use oversized serif titles and a double rule instead
of a surrounding card. The decorative team-abbreviation watermark is removed.
Table headers now use a contrasting ink band, with explicit sort states and
alternating body rows. Analytics filters occupy a horizontal working strip on
desktop; on phones they stack. Statistical definitions, filters, data queries,
chart calculations, and phase behavior are unchanged.

This pass intentionally increases typographic contrast and front-page branding.
Inner-page titles can span two lines; this is a deliberate editorial choice,
while numeric tables retain their existing row geometry and scrolling behavior.
