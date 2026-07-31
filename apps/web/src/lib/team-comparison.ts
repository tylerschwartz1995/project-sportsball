import type { AdvancedTeamLeaderboardRow } from "@/contracts/advanced-leaderboard";
import type { TeamSeasonSummary } from "@/contracts/team";

export const TEAM_COMPARISON_GROUPS = [
  "all",
  "strong",
  "outperforming",
  "underperforming",
  "struggling",
] as const;

export const TEAM_PROCESS_METRICS = [
  "expectedGoalSharePercentage",
  "corsiSharePercentage",
  "fenwickSharePercentage",
] as const;

export type TeamComparisonGroup =
  (typeof TEAM_COMPARISON_GROUPS)[number];
export type TeamProcessMetric = (typeof TEAM_PROCESS_METRICS)[number];

export type TeamComparisonPoint = {
  nhlTeamId: number;
  abbreviation: string;
  name: string;
  gamesPlayed: number;
  resultPercentage: number;
  resultLabel: "Points Percentage" | "Win Percentage";
  processMetrics: Partial<Record<TeamProcessMetric, number>>;
};

export type TeamPlotPoint = TeamComparisonPoint & {
  processPercentage: number;
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
    if (!teamRow || teamRow.stats.gamesPlayed === 0) {
      return [];
    }

    const processMetrics: Partial<Record<TeamProcessMetric, number>> = {};
    setPercentage(
      processMetrics,
      "expectedGoalSharePercentage",
      advancedRow.expectedGoalsPercentage,
    );
    setPercentage(
      processMetrics,
      "corsiSharePercentage",
      advancedRow.corsiPercentage,
    );
    setPercentage(
      processMetrics,
      "fenwickSharePercentage",
      advancedRow.fenwickPercentage,
    );
    if (Object.keys(processMetrics).length === 0) {
      return [];
    }

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
        resultPercentage,
        resultLabel,
        processMetrics,
      },
    ];
  }).sort((left, right) => left.abbreviation.localeCompare(right.abbreviation));
}

export function buildTeamPlotPoints(
  points: TeamComparisonPoint[],
  metric: TeamProcessMetric,
): TeamPlotPoint[] {
  return points.flatMap((point) => {
    const processPercentage = point.processMetrics[metric];
    if (processPercentage === undefined) {
      return [];
    }
    return [
      {
        ...point,
        processPercentage,
        gapPercentagePoints:
          point.resultPercentage - processPercentage,
        group: comparisonGroup(
          processPercentage,
          point.resultPercentage,
        ),
      },
    ];
  });
}

export function filterTeamComparisonPoints(
  points: TeamPlotPoint[],
  group: TeamComparisonGroup,
): TeamPlotPoint[] {
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
  processPercentage: number,
  resultPercentage: number,
): Exclude<TeamComparisonGroup, "all"> {
  if (processPercentage >= 50 && resultPercentage >= 50) {
    return "strong";
  }
  if (processPercentage < 50 && resultPercentage >= 50) {
    return "outperforming";
  }
  if (processPercentage >= 50 && resultPercentage < 50) {
    return "underperforming";
  }
  return "struggling";
}

function setPercentage(
  metrics: Partial<Record<TeamProcessMetric, number>>,
  key: TeamProcessMetric,
  value: number | null,
) {
  if (value !== null) {
    metrics[key] = value * 100;
  }
}
