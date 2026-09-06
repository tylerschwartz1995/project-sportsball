import type {
  GoalieGameLogEntry,
  SkaterGameLogEntry,
} from "@/contracts/game-log";

export type PlayerGamesPageProps = {
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

export const SKATER_SORTS = ["date", "type", "team", "venue", "opponent", "score", "goals", "assists", "points", "plusMinus", "shotsOnGoal", "hits", "blockedShots", "timeOnIce", "gameScore", "individualXGoals", "onIceXGoalsPercentage"] as const;

export const GOALIE_SORTS = ["date", "type", "team", "venue", "opponent", "score", "starter", "decision", "goalsAgainst", "shotsAgainst", "saves", "savePercentage", "timeOnIce", "expectedGoalsAgainst", "goalsSavedAboveExpected"] as const;

export type SkaterSort = (typeof SKATER_SORTS)[number];

export type GoalieSort = (typeof GOALIE_SORTS)[number];

export function parseSkaterSort(value: string | undefined): SkaterSort {
  return SKATER_SORTS.includes(value as SkaterSort) ? (value as SkaterSort) : "date";
}

export function parseGoalieSort(value: string | undefined): GoalieSort {
  return GOALIE_SORTS.includes(value as GoalieSort) ? (value as GoalieSort) : "date";
}

export function gameIdentityValue(game: SkaterGameLogEntry | GoalieGameLogEntry, sort: string): string | number | null | undefined {
  return ({ date: game.gameDate, type: game.gameType, team: game.team.name, venue: game.isHome ? "Home" : "Away", opponent: game.opponent.name, score: game.teamScore === null || game.opponentScore === null ? null : game.teamScore - game.opponentScore, timeOnIce: game.timeOnIceSeconds })[sort];
}

export function sortSkaterGames(rows: SkaterGameLogEntry[], sort: SkaterSort, direction: "asc" | "desc"): SkaterGameLogEntry[] {
  const value = (game: SkaterGameLogEntry): string | number | null => gameIdentityValue(game, sort) ?? (skaterMetricValues(game)[sort] ?? null);
  return [...rows].sort((left, right) => compareNullable(value(left), value(right), direction));
}

export function sortGoalieGames(rows: GoalieGameLogEntry[], sort: GoalieSort, direction: "asc" | "desc"): GoalieGameLogEntry[] {
  const value = (game: GoalieGameLogEntry): string | number | null => gameIdentityValue(game, sort) ?? (goalieMetricValues(game)[sort] ?? null);
  return [...rows].sort((left, right) => compareNullable(value(left), value(right), direction));
}

export function skaterMetricValues(game: SkaterGameLogEntry): Record<string, string | number | null> {
  return { goals: game.goals, assists: game.assists, points: game.points, plusMinus: game.plusMinus, shotsOnGoal: game.shotsOnGoal, hits: game.hits, blockedShots: game.blockedShots, gameScore: game.gameScore, individualXGoals: game.individualXGoals, onIceXGoalsPercentage: game.onIceXGoalsPercentage };
}

export function goalieMetricValues(game: GoalieGameLogEntry): Record<string, string | number | null> {
  return { starter: game.starter ? 1 : 0, decision: game.decision, goalsAgainst: game.goalsAgainst, shotsAgainst: game.shotsAgainst, saves: game.saves, savePercentage: game.savePercentage, expectedGoalsAgainst: game.expectedGoalsAgainst, goalsSavedAboveExpected: game.goalsSavedAboveExpected };
}

export function compareNullable(left: string | number | null, right: string | number | null, direction: "asc" | "desc"): number {
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;
  const comparison = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
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

export function formatTimeOnIce(seconds: number | null): string {
  if (seconds === null) {
    return "—";
  }
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}

export function formatPercentage(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

export function formatSavePercentage(value: number | null): string {
  return value === null ? "—" : value.toFixed(3).replace(/^0/, "");
}

export function formatDecimal(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}

export function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function formatSignedDecimal(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

export function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
