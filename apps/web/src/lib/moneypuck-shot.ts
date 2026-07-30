const REGULATION_PERIOD_SECONDS = 20 * 60;

export function formatMoneyPuckPeriodClock(
  gameTimeSeconds: number,
  period: number,
): string {
  const elapsedBeforePeriod = Math.max(0, period - 1) * REGULATION_PERIOD_SECONDS;
  const periodSeconds = Math.max(0, gameTimeSeconds - elapsedBeforePeriod);

  return `${Math.floor(periodSeconds / 60)}:${String(periodSeconds % 60).padStart(2, "0")}`;
}
