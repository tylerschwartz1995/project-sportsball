/** Client-only presentation choices that survive same-page context changes. */
export const PRESENTATION_PARAMETERS = [
  "resultView",
  "returnTo",
  "highlightTeam",
  "shotPeriod",
  "shotResult",
  "shotShooter",
  "display",
  "chartWindow",
  "chartVenue",
  "chartMetric",
  "chartDivision",
  "showGoals",
  "showExpectedGoals",
  "resultMap",
  "plotMetric",
  "plotGroup",
  "xMetric",
  "yMetric",
  "teamA",
  "teamB",
  "playerA",
  "playerB",
  "comparisonMetric",
  "flowChart",
  "outcomeMetric",
  "roundGroup",
  "advancedMetrics",
  "advancedSituation",
  "recordMetric",
  "leagueMetric",
  "skaterDecadeMetric",
  "goalieDecadeMetric",
  "sos",
] as const;

export function preservePresentation(target: URLSearchParams, current: URLSearchParams) {
  for (const name of PRESENTATION_PARAMETERS) {
    const value = current.get(name);
    if (value === null) target.delete(name);
    else target.set(name, value);
  }
  return target;
}
