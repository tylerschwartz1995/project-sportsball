import type {
  MoneyPuckSeasonUnitType,
  MoneyPuckUnitGameStats,
} from "@/contracts/season-unit";

export type UnitPageProps = {
  params: Promise<{ unit: string }>;
  searchParams: Promise<{
    season?: string | string[];
    team?: string | string[];
  }>;
};

export function parseUnitRoute(value: string): {
  unitType: MoneyPuckSeasonUnitType;
  playerNhlIds: number[];
} | null {
  const [type, ...rawIds] = value.split("-");
  const unitType = type === "line" || type === "pairing" ? type : null;
  const playerNhlIds = rawIds.map(Number);
  const expected = unitType === "line" ? 3 : 2;
  return unitType && playerNhlIds.length === expected && playerNhlIds.every(Number.isSafeInteger)
    ? { unitType, playerNhlIds }
    : null;
}

export function parsePositiveInteger(value: string | undefined): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function formatScore(game: MoneyPuckUnitGameStats): string {
  return game.teamScore === null || game.opponentScore === null
    ? "—"
    : `${game.teamScore}–${game.opponentScore}`;
}

export function scoreDifferential(game: MoneyPuckUnitGameStats): number | null {
  return difference(game.teamScore, game.opponentScore);
}

export function difference(left: number | null, right: number | null): number | null {
  return left === null || right === null ? null : left - right;
}

export function formatTime(value: number): string {
  const seconds = Math.round(value);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function formatPercentage(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

export function formatPair(left: number | null, right: number | null, digits = 2): string {
  return left === null || right === null ? "—" : `${left.toFixed(digits)}–${right.toFixed(digits)}`;
}
