import type {
  AdvancedGoalieLeaderboardRow,
  AdvancedSkaterLeaderboardRow,
  AdvancedTeamLeaderboardRow,
} from "@/contracts/advanced-leaderboard";
import {
  listAdvancedGoalieLeaders,
  listAdvancedSkaterLeaders,
  listAdvancedTeamLeaders,
} from "@/data/advanced-leaderboard";
import { firstQueryValue } from "@/lib/directory";

export const LEADERBOARD_TYPES = ["teams", "skaters", "goalies"] as const;

export const SITUATIONS = ["all", "5on5", "5on4", "4on5"] as const;

export const MINIMUM_MINUTES = [0, 100, 300, 500, 1000] as const;

export type LeaderboardType = (typeof LEADERBOARD_TYPES)[number];

export type Situation = (typeof SITUATIONS)[number];

export type AnalyticsPageProps = {
  searchParams: Promise<{
    season?: string | string[];
    type?: string | string[];
    situation?: string | string[];
    minimum?: string | string[];
    phase?: string | string[];
    display?: string | string[];
    plotMetric?: string | string[];
    plotGroup?: string | string[];
    xMetric?: string | string[];
    yMetric?: string | string[];
    teamA?: string | string[];
    teamB?: string | string[];
    playerA?: string | string[];
    playerB?: string | string[];
  }>;
};

export function pickQueryParams(
  params: Record<string, string | string[] | undefined>,
  names: string[],
): Record<string, string | undefined> {
  return Object.fromEntries(names.map((name) => [name, firstQueryValue(params[name])]));
}

export type LeaderboardRows =
  | AdvancedTeamLeaderboardRow[]
  | AdvancedSkaterLeaderboardRow[]
  | AdvancedGoalieLeaderboardRow[];

export async function loadLeaderboard(
  type: LeaderboardType,
  seasonId: number,
  situation: Situation,
  minimumIceTimeSeconds: number,
  gameType: number,
): Promise<LeaderboardRows> {
  if (type === "teams") {
    return listAdvancedTeamLeaders(seasonId, situation, gameType);
  }
  if (type === "goalies") {
    return listAdvancedGoalieLeaders(
      seasonId,
      situation,
      minimumIceTimeSeconds,
    );
  }
  return listAdvancedSkaterLeaders(
    seasonId,
    situation,
    minimumIceTimeSeconds,
  );
}

export function parseLeaderboardType(value: string | undefined): LeaderboardType {
  return LEADERBOARD_TYPES.includes(value as LeaderboardType)
    ? (value as LeaderboardType)
    : "teams";
}

export function parseSituation(
  value: string | undefined,
  fallback: Situation,
): Situation {
  return SITUATIONS.includes(value as Situation)
    ? (value as Situation)
    : fallback;
}

export function parseMinimumMinutes(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  return MINIMUM_MINUTES.includes(
    parsed as (typeof MINIMUM_MINUTES)[number],
  )
    ? parsed
    : fallback;
}

export function situationLabel(value: string): string {
  switch (value) {
    case "all":
      return "All situations";
    case "5on5":
      return "5-on-5";
    case "5on4":
      return "5-on-4 power play";
    case "4on5":
      return "4-on-5 penalty kill";
    default:
      return value;
  }
}

export function formatMinutes(seconds: number): string {
  return Math.round(seconds / 60).toLocaleString("en-CA");
}

export function formatPercentage(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

export function formatDecimal(value: number | null, digits = 2): string {
  return value === null ? "—" : value.toFixed(digits);
}

export function formatSignedDecimal(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}
