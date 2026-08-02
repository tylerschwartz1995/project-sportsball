export const ROLLING_WINDOWS = [5, 10, 20] as const;

export type RollingWindow = (typeof ROLLING_WINDOWS)[number];
export type PerformanceVenue = "all" | "home" | "away";

export function filterGamesByVenue<T extends { isHome: boolean }>(
  games: T[],
  venue: PerformanceVenue,
): T[] {
  if (venue === "all") {
    return games;
  }

  return games.filter((game) =>
    venue === "home" ? game.isHome : !game.isHome,
  );
}

export function stableMetricDomain(
  values: number[],
  options: {
    percentage?: boolean;
    signed?: boolean;
    referenceValue?: number;
  } = {},
): [number, number] {
  const available = values.filter(Number.isFinite);
  if (options.referenceValue !== undefined) {
    available.push(options.referenceValue);
  }
  if (available.length === 0) {
    return options.percentage ? [0, 100] : [0, 1];
  }

  if (options.signed) {
    const limit = halfStepCeiling(
      Math.max(...available.map((value) => Math.abs(value))) * 1.1,
    );
    return [-limit, limit];
  }

  if (options.percentage) {
    const minimum = Math.min(...available);
    const maximum = Math.max(...available);
    const padding = Math.max(1.5, (maximum - minimum) * 0.12);
    return [
      Math.max(0, Math.floor(minimum - padding)),
      Math.min(100, Math.ceil(maximum + padding)),
    ];
  }

  return [0, halfStepCeiling(Math.max(...available) * 1.08)];
}

function halfStepCeiling(value: number): number {
  return Math.max(0.5, Math.ceil(value * 2) / 2);
}
