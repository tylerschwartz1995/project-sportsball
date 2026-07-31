import { describe, expect, it } from "vitest";

import type {
  AdvancedGoalieLeaderboardRow,
  AdvancedSkaterLeaderboardRow,
} from "@/contracts/advanced-leaderboard";
import {
  buildDistribution,
  buildGoalieComparisonPoints,
  buildPlotPoints,
  buildSkaterComparisonPoints,
  filterPlayerComparisonPoints,
  metricValue,
  numericDomain,
  playerPointKey,
  signedDomain,
} from "@/lib/player-comparison";

describe("player comparison points", () => {
  it("normalizes skater totals per 60 and shares as percentages", () => {
    const [point] = buildSkaterComparisonPoints([
      skaterRow("D", 3600, 0.8, 1, 2, 0.55),
    ]);

    expect(point).toMatchObject({
      kind: "skater",
      group: "defense",
      metrics: {
        individualExpectedGoalsPer60: 0.8,
        goalsPer60: 1,
        pointsPer60: 2,
      },
    });
    expect(point.metrics.onIceExpectedGoalsPercentage).toBeCloseTo(55);
  });

  it("keeps skaters with partial metrics and omits empty rows", () => {
    const points = buildSkaterComparisonPoints([
      skaterRow("C", 7200, null, null, 3, null),
      skaterRow("L", 0, 1, 1, 1, 0.5),
    ]);

    expect(points).toHaveLength(1);
    expect(points[0].group).toBe("forwards");
    expect(points[0].metrics.pointsPer60).toBe(1.5);
  });

  it("normalizes every available goalie counting metric", () => {
    const [point] = buildGoalieComparisonPoints([
      goalieRow(7200, 6, 5, 64, 60),
    ]);

    expect(point).toMatchObject({
      kind: "goalie",
      group: "aboveExpected",
      metrics: {
        expectedGoalsAgainstPer60: 3,
        goalsAgainstPer60: 2.5,
        goalsSavedAboveExpectedPer60: 0.5,
        expectedShotsOnGoalAgainstPer60: 32,
        shotsOnGoalAgainstPer60: 30,
      },
    });
  });

  it("builds plot points only when both selected metrics exist", () => {
    const points = buildSkaterComparisonPoints([
      skaterRow("C", 3600, 1, 2, 3, 0.52),
      skaterRow("D", 3600, null, 1, 2, 0.48),
    ]);
    const plot = buildPlotPoints(
      points,
      "individualExpectedGoalsPer60",
      "goalsPer60",
    );

    expect(plot).toHaveLength(1);
    expect(plot[0]).toMatchObject({ xValue: 1, yValue: 2 });
  });

  it("filters groups and resolves stable point keys and metric values", () => {
    const points = buildSkaterComparisonPoints([
      skaterRow("C", 3600, 1, 1, 1, 0.5),
      skaterRow("D", 3600, 1, 1, 1, 0.5),
    ]);

    expect(filterPlayerComparisonPoints(points, "defense")).toHaveLength(1);
    expect(playerPointKey(points[0])).toBe("67:1");
    expect(metricValue(points[0], "goalsPer60")).toBe(1);
  });
});

describe("player comparison chart helpers", () => {
  it("builds padded domains with optional reference values", () => {
    expect(numericDomain([0.5, 1.5])).toEqual([0.4, 1.6]);
    expect(numericDomain([52, 58], { includeValues: [50] })).toEqual([
      49.2,
      58.8,
    ]);
    expect(signedDomain([-0.5, 0.75])).toEqual([-0.84, 0.84]);
  });

  it("builds a fixed-domain distribution without losing values", () => {
    const bins = buildDistribution([-1, -0.2, 0, 0.4, 1], [-1.2, 1.2], 9);

    expect(bins).toHaveLength(9);
    expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(5);
    expect(bins[4].minimum).toBeLessThanOrEqual(0);
    expect(bins[4].maximum).toBeGreaterThan(0);
  });
});

function skaterRow(
  position: string,
  iceTimeSeconds: number,
  individualExpectedGoals: number | null,
  individualGoals: number | null,
  individualPoints: number | null,
  onIceExpectedGoalsPercentage: number | null,
): AdvancedSkaterLeaderboardRow {
  return {
    player: {
      nhlPlayerId: position.charCodeAt(0),
      name: `${position} Skater`,
      position,
    },
    team: team(),
    situation: "5on5",
    gamesPlayed: 20,
    iceTimeSeconds,
    gameScore: 4,
    onIceExpectedGoalsPercentage,
    onIceCorsiPercentage: 0.51,
    onIceFenwickPercentage: 0.49,
    individualExpectedGoals,
    individualGoals,
    individualPoints,
  };
}

function goalieRow(
  iceTimeSeconds: number,
  expectedGoalsAgainst: number | null,
  goalsAgainst: number | null,
  expectedShotsOnGoalAgainst: number | null,
  shotsOnGoalAgainst: number | null,
): AdvancedGoalieLeaderboardRow {
  return {
    player: {
      nhlPlayerId: 1,
      name: "Test Goalie",
      position: "G",
    },
    team: team(),
    situation: "all",
    gamesPlayed: 10,
    iceTimeSeconds,
    expectedGoalsAgainst,
    goalsAgainst,
    goalsSavedAboveExpected:
      expectedGoalsAgainst === null || goalsAgainst === null
        ? null
        : expectedGoalsAgainst - goalsAgainst,
    expectedShotsOnGoalAgainst,
    shotsOnGoalAgainst,
  };
}

function team() {
  return {
    id: 1,
    nhlTeamId: 1,
    franchiseId: 1,
    abbreviation: "TST",
    name: "Test Team",
  };
}
