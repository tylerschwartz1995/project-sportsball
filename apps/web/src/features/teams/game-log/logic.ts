import type { TeamGameLogEntry } from "@/contracts/game-log";

export type TeamGamesPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    season?: string | string[];
    phase?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
    sort?: string | string[];
    direction?: string | string[];
  }>;
};

export const TEAM_GAME_SORTS = ["date", "type", "venue", "opponent", "result", "score", "shots", "opponentShots", "xGoalsShare", "xGoalsFor", "xGoalsAgainst"] as const;

export type TeamGameSort = (typeof TEAM_GAME_SORTS)[number];

export function parseTeamGameSort(value: string | undefined): TeamGameSort {
  return TEAM_GAME_SORTS.includes(value as TeamGameSort) ? (value as TeamGameSort) : "date";
}

export function sortTeamGames(rows: TeamGameLogEntry[], sort: TeamGameSort, direction: "asc" | "desc"): TeamGameLogEntry[] {
  const value = (game: TeamGameLogEntry): string | number | null => ({
    date: game.gameDate,
    type: game.gameType,
    venue: game.isHome ? "Home" : "Away",
    opponent: game.opponent.name,
    result: game.result,
    score: game.score - game.opponentScore,
    shots: game.shotsOnGoal,
    opponentShots: game.opponentShotsOnGoal,
    xGoalsShare: game.fiveOnFiveXGoalsPercentage,
    xGoalsFor: game.fiveOnFiveXGoalsFor,
    xGoalsAgainst: game.fiveOnFiveXGoalsAgainst,
  })[sort];
  return [...rows].sort((left, right) => compareNullable(value(left), value(right), direction));
}

export function compareNullable(left: string | number | null, right: string | number | null, direction: "asc" | "desc"): number {
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;
  const comparison = typeof left === "number" && typeof right === "number"
    ? left - right
    : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
  return direction === "asc" ? comparison : -comparison;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function formatPercentage(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

export function formatDecimal(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}

export function resultClassName(result: TeamGameLogEntry["result"]): string {
  if (result === "W") {
    return "border-[color-mix(in_srgb,var(--positive)_42%,var(--border))] bg-[var(--positive-soft)] text-[var(--positive)]";
  }
  if (result === "OTL") {
    return "border-[color-mix(in_srgb,var(--warning)_42%,var(--border))] bg-[var(--warning-soft)] text-[var(--warning)]";
  }
  return "border-[color-mix(in_srgb,var(--negative)_42%,var(--border))] bg-[var(--negative-soft)] text-[var(--negative)]";
}

export function resultTextClassName(result: TeamGameLogEntry["result"]): string {
  if (result === "W") {
    return "text-[var(--positive)]";
  }
  if (result === "OTL") {
    return "text-[var(--warning)]";
  }
  return "text-[var(--negative)]";
}

export function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
