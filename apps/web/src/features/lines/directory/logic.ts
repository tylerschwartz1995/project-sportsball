import type { MoneyPuckSeasonUnitStats } from "@/contracts/season-unit";

export const ICE_TIME_OPTIONS = [0, 20, 50, 100, 200, 300] as const;

export const DEFAULT_MINIMUM_MINUTES = 100;

export const WINDOW_OPTIONS = [10, 20, 40] as const;

export const UNIT_VIEWS = ["lines", "pairings"] as const;

export const UNIT_SORTS = ["team", "players", "games", "iceTime", "xgPercentage", "corsiPercentage", "xGoalsFor", "xGoalsAgainst", "goalsFor", "goalsAgainst", "shotsFor", "shotsAgainst"] as const;

export type LinesPageProps = {
  searchParams: Promise<{
    season?: string | string[];
    minimum?: string | string[];
    team?: string | string[];
    window?: string | string[];
    view?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
    sort?: string | string[];
    direction?: string | string[];
  }>;
};

export function unitViewHref(
  params: Record<string, string | number | undefined>,
  view: (typeof UNIT_VIEWS)[number],
): string {
  const search = new URLSearchParams();
  Object.entries({ ...params, view, page: undefined }).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });
  return `/lines?${search.toString()}`;
}

export function sortUnits(
  rows: MoneyPuckSeasonUnitStats[],
  sort: (typeof UNIT_SORTS)[number],
  direction: "asc" | "desc",
): MoneyPuckSeasonUnitStats[] {
  const value = (row: MoneyPuckSeasonUnitStats): string | number | null => ({
    team: row.team.name,
    players: row.players.map((player) => player.name).join(" "),
    games: row.gamesPlayed,
    iceTime: row.iceTimeSeconds,
    xgPercentage: row.expectedGoalsPercentage,
    corsiPercentage: row.corsiPercentage,
    xGoalsFor: row.expectedGoalsFor,
    xGoalsAgainst: row.expectedGoalsAgainst,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    shotsFor: row.shotsOnGoalFor,
    shotsAgainst: row.shotsOnGoalAgainst,
  })[sort];
  return [...rows].sort((left, right) => {
    const a = value(left);
    const b = value(right);
    if (a === null) return b === null ? 0 : 1;
    if (b === null) return -1;
    const comparison = typeof a === "number" && typeof b === "number"
      ? a - b
      : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
    return direction === "asc" ? comparison : -comparison;
  });
}

export function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
