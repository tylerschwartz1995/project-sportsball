import { describe, expect, it } from "vitest";

import type { AdvancedTeamLeaderboardRow } from "@/contracts/advanced-leaderboard";
import type { TeamSeasonSummary } from "@/contracts/team";
import {
  buildTeamComparisonPoints,
  buildTeamPlotPoints,
  comparisonDomain,
  filterTeamComparisonPoints,
} from "@/lib/team-comparison";

describe("buildTeamComparisonPoints", () => {
  it("joins official results to five-on-five expected-goal share", () => {
    const result = buildTeamComparisonPoints(
      [advancedRow(21, "COL", 0.57)],
      [teamRow(21, "COL", 82, 121, 55)],
      "regular",
    );

    expect(result[0]).toMatchObject({
      abbreviation: "COL",
      resultLabel: "Points Percentage",
    });
    expect(
      result[0].processMetrics.expectedGoalSharePercentage,
    ).toBeCloseTo(57);
    expect(result[0].resultPercentage).toBeCloseTo(73.78, 1);
    const [plotPoint] = buildTeamPlotPoints(
      result,
      "expectedGoalSharePercentage",
    );
    expect(plotPoint.group).toBe("strong");
    expect(plotPoint.gapPercentagePoints).toBeCloseTo(16.78, 1);
  });

  it("uses win percentage for playoff comparisons", () => {
    const result = buildTeamComparisonPoints(
      [advancedRow(12, "CAR", 0.48)],
      [teamRow(12, "CAR", 10, 0, 6)],
      "playoffs",
    );

    const [plotPoint] = buildTeamPlotPoints(
      result,
      "expectedGoalSharePercentage",
    );
    expect(result[0]).toMatchObject({
      resultPercentage: 60,
      resultLabel: "Win Percentage",
    });
    expect(plotPoint).toMatchObject({
      group: "outperforming",
    });
  });

  it("omits teams without a comparable advanced value", () => {
    expect(
      buildTeamComparisonPoints(
        [advancedRow(21, "COL", null)],
        [teamRow(21, "COL", 82, 121, 55)],
        "regular",
      ),
    ).toEqual([]);
  });
});

describe("team comparison filters", () => {
  const comparisonPoints = buildTeamComparisonPoints(
    [
      advancedRow(1, "AAA", 0.55),
      advancedRow(2, "BBB", 0.45),
      advancedRow(3, "CCC", 0.55),
      advancedRow(4, "DDD", 0.45),
    ],
    [
      teamRow(1, "AAA", 10, 12, 6),
      teamRow(2, "BBB", 10, 12, 6),
      teamRow(3, "CCC", 10, 8, 4),
      teamRow(4, "DDD", 10, 8, 4),
    ],
    "regular",
  );
  const points = buildTeamPlotPoints(
    comparisonPoints,
    "expectedGoalSharePercentage",
  );

  it("filters points by their result/process quadrant", () => {
    expect(filterTeamComparisonPoints(points, "strong")).toHaveLength(1);
    expect(filterTeamComparisonPoints(points, "outperforming")[0].abbreviation)
      .toBe("BBB");
    expect(filterTeamComparisonPoints(points, "underperforming")[0].abbreviation)
      .toBe("CCC");
    expect(filterTeamComparisonPoints(points, "struggling")[0].abbreviation)
      .toBe("DDD");
  });

  it("builds padded domains that always include the 50 percent baseline", () => {
    expect(comparisonDomain([52, 58])).toEqual([47, 61]);
    expect(comparisonDomain([35, 44])).toEqual([32, 53]);
    expect(comparisonDomain([])).toEqual([40, 60]);
  });

  it("can rebuild team quadrants from another process metric", () => {
    const comparison = buildTeamComparisonPoints(
      [advancedRow(1, "AAA", 0.55, 0.45, 0.52)],
      [teamRow(1, "AAA", 10, 12, 6)],
      "regular",
    );

    expect(
      buildTeamPlotPoints(comparison, "corsiSharePercentage")[0],
    ).toMatchObject({
      processPercentage: 45,
      group: "outperforming",
    });
    expect(
      comparison[0].processMetrics.fenwickSharePercentage,
    ).toBeCloseTo(52);
  });
});

function advancedRow(
  nhlTeamId: number,
  abbreviation: string,
  expectedGoalsPercentage: number | null,
  corsiPercentage: number | null = null,
  fenwickPercentage: number | null = null,
): AdvancedTeamLeaderboardRow {
  return {
    team: {
      id: nhlTeamId,
      nhlTeamId,
      franchiseId: nhlTeamId,
      abbreviation,
      name: `${abbreviation} Team`,
    },
    situation: "5on5",
    gamesPlayed: 82,
    iceTimeSeconds: 240_000,
    expectedGoalsPercentage,
    corsiPercentage,
    fenwickPercentage,
    expectedGoalsFor: null,
    expectedGoalsAgainst: null,
    goalsFor: null,
    goalsAgainst: null,
  };
}

function teamRow(
  nhlTeamId: number,
  abbreviation: string,
  gamesPlayed: number,
  standingsPoints: number,
  wins: number,
): TeamSeasonSummary {
  return {
    team: {
      id: nhlTeamId,
      nhlTeamId,
      franchiseId: nhlTeamId,
      abbreviation,
      name: `${abbreviation} Team`,
    },
    stats: {
      seasonId: 20252026,
      gameType: 2,
      gamesPlayed,
      wins,
      losses: gamesPlayed - wins,
      regulationWins: wins,
      overtimeWins: 0,
      shootoutWins: 0,
      regulationLosses: gamesPlayed - wins,
      overtimeLosses: 0,
      shootoutLosses: 0,
      standingsPoints,
      goalsFor: 0,
      goalsAgainst: 0,
      shotsFor: 0,
      shotsAgainst: 0,
    },
  };
}
