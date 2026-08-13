export function parseTimelinePeriod(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;

  const period = Number(value);
  return Number.isSafeInteger(period) && period > 0 && period <= 20
    ? period
    : null;
}

export function gameTimelineHref(
  nhlGameId: number,
  period: number | null,
): string {
  const params = new URLSearchParams({ view: "scoring" });
  if (period !== null) {
    params.set("timelinePeriod", String(period));
  }
  return `/games/${nhlGameId}?${params.toString()}#timeline`;
}
