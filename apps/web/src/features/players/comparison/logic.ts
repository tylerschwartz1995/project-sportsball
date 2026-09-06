import type { MoneyPuckPlayerSeason } from "@/contracts/advanced";
import type {
  GoalieSeasonSummary,
  SkaterSeasonSummary,
} from "@/contracts/player";
import type {
  PlayerComparisonEntry,
  PlayerComparisonMetric,
} from "@/contracts/player-comparison-view";

export type PlayerCategory = "skaters" | "goalies";

export type PlayerComparePageProps = {
  searchParams: Promise<{
    season?: string | string[];
    phase?: string | string[];
    type?: string | string[];
    players?: string | string[];
  }>;
};

export const SKATER_METRICS: PlayerComparisonMetric[] = [
  { key: "gamesPlayed", label: "Games Played", shortLabel: "GP", unit: "integer" },
  { key: "goals", label: "Goals", shortLabel: "G", unit: "integer" },
  { key: "assists", label: "Assists", shortLabel: "A", unit: "integer" },
  { key: "points", label: "Points", shortLabel: "PTS", unit: "integer" },
  { key: "pointsPerGame", label: "Points per Game", shortLabel: "PTS/GP", unit: "decimal" },
  { key: "plusMinus", label: "Plus / Minus", shortLabel: "+/-", unit: "signed" },
  { key: "shotsOnGoal", label: "Shots on Goal", shortLabel: "S", unit: "integer" },
  { key: "individualExpectedGoals", label: "5-on-5 Individual Expected Goals", shortLabel: "ixG", unit: "decimal" },
  { key: "gameScore", label: "5-on-5 Game Score", shortLabel: "Game Score", unit: "decimal" },
  { key: "expectedGoalsPercentage", label: "5-on-5 On-Ice Expected-Goal Share", shortLabel: "xG%", unit: "percentage" },
  { key: "corsiPercentage", label: "5-on-5 On-Ice Corsi Share", shortLabel: "CF%", unit: "percentage" },
];

export const GOALIE_METRICS: PlayerComparisonMetric[] = [
  { key: "gamesPlayed", label: "Games Played", shortLabel: "GP", unit: "integer" },
  { key: "gamesStarted", label: "Games Started", shortLabel: "GS", unit: "integer" },
  { key: "wins", label: "Wins", shortLabel: "W", unit: "integer" },
  { key: "losses", label: "Losses", shortLabel: "L", unit: "integer" },
  { key: "overtimeLosses", label: "Overtime Losses", shortLabel: "OTL", unit: "integer" },
  { key: "savePercentage", label: "Save Percentage", shortLabel: "SV%", unit: "savePercentage" },
  { key: "saves", label: "Saves", shortLabel: "SV", unit: "integer" },
  { key: "goalsAgainst", label: "Goals Against", shortLabel: "GA", unit: "integer" },
  { key: "expectedGoalsAgainst", label: "Expected Goals Against", shortLabel: "xGA", unit: "decimal" },
  { key: "goalsSavedAboveExpected", label: "Goals Saved Above Expected", shortLabel: "GSAx", unit: "decimal" },
];

export function buildSkaterEntry(
  player: SkaterSeasonSummary,
  advanced: MoneyPuckPlayerSeason | undefined,
): PlayerComparisonEntry {
  const rows =
    advanced?.skaterSituations.filter(
      (row) => row.situation === "5on5",
    ) ?? [];
  return {
    nhlPlayerId: player.nhlPlayerId,
    name: player.name,
    position: player.position,
    teams: player.teams,
    values: {
      gamesPlayed: player.gamesPlayed,
      goals: player.goals,
      assists: player.assists,
      points: player.points,
      pointsPerGame:
        player.gamesPlayed === 0 ? null : player.points / player.gamesPlayed,
      plusMinus: player.plusMinus,
      shotsOnGoal: player.shotsOnGoal,
      individualExpectedGoals: sumNullable(
        rows.map((row) => row.individualExpectedGoals),
      ),
      gameScore: sumNullable(rows.map((row) => row.gameScore)),
      expectedGoalsPercentage: weightedAverage(
        rows,
        (row) => row.onIceExpectedGoalsPercentage,
      ),
      corsiPercentage: weightedAverage(
        rows,
        (row) => row.onIceCorsiPercentage,
      ),
    },
  };
}

export function buildGoalieEntry(
  player: GoalieSeasonSummary,
  advanced: MoneyPuckPlayerSeason | undefined,
): PlayerComparisonEntry {
  const rows =
    advanced?.goalieSituations.filter(
      (row) => row.situation === "all",
    ) ?? [];
  const expectedGoalsAgainst = sumNullable(
    rows.map((row) => row.expectedGoalsAgainst),
  );
  const advancedGoalsAgainst = sumNullable(
    rows.map((row) => row.goalsAgainst),
  );
  return {
    nhlPlayerId: player.nhlPlayerId,
    name: player.name,
    position: player.position,
    teams: player.teams,
    values: {
      gamesPlayed: player.gamesPlayed,
      gamesStarted: player.gamesStarted,
      wins: player.wins,
      losses: player.losses,
      overtimeLosses: player.overtimeLosses,
      savePercentage: player.savePercentage,
      saves: player.saves,
      goalsAgainst: player.goalsAgainst,
      expectedGoalsAgainst,
      goalsSavedAboveExpected:
        expectedGoalsAgainst === null || advancedGoalsAgainst === null
          ? null
          : expectedGoalsAgainst - advancedGoalsAgainst,
    },
  };
}

export function parsePlayerIds(value: string | undefined): number[] {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(",")
        .map(Number)
        .filter(
          (candidate) =>
            Number.isSafeInteger(candidate) && candidate > 0,
        ),
    ),
  ].slice(0, 4);
}

export function weightedAverage<T extends { iceTimeSeconds: number }>(
  rows: T[],
  getValue: (row: T) => number | null,
): number | null {
  let numerator = 0;
  let denominator = 0;
  for (const row of rows) {
    const value = getValue(row);
    if (value === null) continue;
    numerator += value * row.iceTimeSeconds;
    denominator += row.iceTimeSeconds;
  }
  return denominator === 0 ? null : numerator / denominator;
}

export function sumNullable(values: Array<number | null>): number | null {
  const available = values.filter(
    (value): value is number => value !== null,
  );
  return available.length === 0
    ? null
    : available.reduce((total, value) => total + value, 0);
}
