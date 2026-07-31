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
