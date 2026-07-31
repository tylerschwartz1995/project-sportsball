import type { AdvancedTeamLeaderboardRow } from "@/contracts/advanced-leaderboard";
import type { TeamSeasonSummary } from "@/contracts/team";

export const TEAM_COMPARISON_GROUPS = [
  "all",
  "strong",
  "outperforming",
  "underperforming",
  "struggling",
] as const;

export type TeamComparisonGroup =
  (typeof TEAM_COMPARISON_GROUPS)[number];

export type TeamComparisonPoint = {
  nhlTeamId: number;
  abbreviation: string;
  name: string;
  gamesPlayed: number;
  expectedGoalSharePercentage: number;
  resultPercentage: number;
  resultLabel: "Points Percentage" | "Win Percentage";
  gapPercentagePoints: number;
  group: Exclude<TeamComparisonGroup, "all">;
};

export function buildTeamComparisonPoints(
  advancedRows: AdvancedTeamLeaderboardRow[],
  teamRows: TeamSeasonSummary[],
  phase: "regular" | "playoffs",
): TeamComparisonPoint[] {
  const teamsByNhlId = new Map(
    teamRows.map((row) => [row.team.nhlTeamId, row]),
  );

  return advancedRows.flatMap((advancedRow) => {
    const teamRow = teamsByNhlId.get(advancedRow.team.nhlTeamId);
    const expectedGoalShare = advancedRow.expectedGoalsPercentage;
    if (
      !teamRow ||
      expectedGoalShare === null ||
      teamRow.stats.gamesPlayed === 0
    ) {
      return [];
    }

    const expectedGoalSharePercentage = expectedGoalShare * 100;
    const resultPercentage =
      phase === "regular"
        ? (teamRow.stats.standingsPoints /
            (teamRow.stats.gamesPlayed * 2)) *
          100
        : (teamRow.stats.wins / teamRow.stats.gamesPlayed) * 100;
    const resultLabel =
      phase === "regular"
        ? ("Points Percentage" as const)
        : ("Win Percentage" as const);

    return [
      {
        nhlTeamId: advancedRow.team.nhlTeamId,
        abbreviation: advancedRow.team.abbreviation,
        name: advancedRow.team.name,
        gamesPlayed: teamRow.stats.gamesPlayed,
        expectedGoalSharePercentage,
        resultPercentage,
        resultLabel,
        gapPercentagePoints:
          resultPercentage - expectedGoalSharePercentage,
        group: comparisonGroup(
          expectedGoalSharePercentage,
          resultPercentage,
        ),
      },
    ];
  }).sort((left, right) => left.abbreviation.localeCompare(right.abbreviation));
}

export function filterTeamComparisonPoints(
  points: TeamComparisonPoint[],
  group: TeamComparisonGroup,
): TeamComparisonPoint[] {
  return group === "all"
    ? points
    : points.filter((point) => point.group === group);
}

export function comparisonDomain(values: number[]): [number, number] {
  if (values.length === 0) {
    return [40, 60];
  }

  const minimum = Math.min(50, ...values);
  const maximum = Math.max(50, ...values);
  const padding = Math.max(2.5, (maximum - minimum) * 0.12);

  return [
    Math.max(0, Math.floor(minimum - padding)),
    Math.min(100, Math.ceil(maximum + padding)),
  ];
}

function comparisonGroup(
  expectedGoalSharePercentage: number,
  resultPercentage: number,
): Exclude<TeamComparisonGroup, "all"> {
  if (expectedGoalSharePercentage >= 50 && resultPercentage >= 50) {
    return "strong";
  }
  if (expectedGoalSharePercentage < 50 && resultPercentage >= 50) {
    return "outperforming";
  }
  if (expectedGoalSharePercentage >= 50 && resultPercentage < 50) {
    return "underperforming";
  }
  return "struggling";
}
