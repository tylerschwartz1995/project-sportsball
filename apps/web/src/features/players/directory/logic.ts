import type {
  PlayerLocation
} from "@/contracts/player";
import {
  type PlayerDirectoryPage
} from "@/data/players";

export type PlayersPageProps = {
  searchParams: Promise<{
    season?: string | string[];
    q?: string | string[];
    type?: string | string[];
    sort?: string | string[];
    dir?: string | string[];
    page?: string | string[];
    phase?: string | string[];
    minGames?: string | string[];
    minGoals?: string | string[];
    minAssists?: string | string[];
    minPoints?: string | string[];
    minWins?: string | string[];
    minSavePercentage?: string | string[];
    country?: string | string[];
    region?: string | string[];
    city?: string | string[];
    position?: string | string[];
  }>;
};

export const skaterTableColumns = [
  { key: "games", label: "GP" },
  { key: "goals", label: "G" },
  { key: "assists", label: "A" },
  { key: "points", label: "PTS" },
  { key: "plusMinus", label: "+/-" },
  { key: "penaltyMinutes", label: "PIM" },
  { key: "shotsOnGoal", label: "S" },
  { key: "teamsPlayedFor", label: "Teams" },
];

export const goalieTableColumns = [
  { key: "games", label: "GP" },
  { key: "gamesStarted", label: "GS" },
  { key: "wins", label: "W" },
  { key: "losses", label: "L" },
  { key: "overtimeLosses", label: "OTL" },
  { key: "goalsAgainst", label: "GA" },
  { key: "saves", label: "SV" },
  { key: "savePercentage", label: "SV%" },
];

export function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function formatSavePercentage(value: number | null): string {
  return value === null ? "—" : value.toFixed(3).replace(/^0/, "");
}

export function parseMinimum(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function emptyDirectoryPage<Player>(): PlayerDirectoryPage<Player> {
  return {
    items: [],
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    firstItem: 0,
    lastItem: 0,
    locations: [] satisfies PlayerLocation[],
  };
}
