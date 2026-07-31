import { describe, expect, it } from "vitest";

import type {
  AdvancedGoalieLeaderboardRow,
  AdvancedSkaterLeaderboardRow,
} from "@/contracts/advanced-leaderboard";
import {
  buildCenteredDistribution,
  buildGoalieComparisonPoints,
  buildSkaterComparisonPoints,
  filterPlayerComparisonPoints,
  numericDomain,
  signedDomain,
} from "@/lib/player-comparison";

describe("player comparison points", () => {
  it("normalizes skater goals and expected goals per 60 minutes", () => {
    const [point] = buildSkaterComparisonPoints([
      skaterRow("D", 3600, 0.8, 1),
    ]);

    expect(point).toMatchObject({
      kind: "skater",
      group: "defense",
      xValue: 0.8,
      yValue: 1,
    });
    expect(point.differenceValue).toBeCloseTo(0.2);
  });

  it("groups forwards and omits skaters without comparable values", () => {
    const points = buildSkaterComparisonPoints([
      skaterRow("C", 7200, 2, 3),
      skaterRow("L", 0, 1, 1),
      skaterRow("R", 3600, null, 1),
    ]);

    expect(points).toHaveLength(1);
    expect(points[0].group).toBe("forwards");
    expect(points[0].yValue).toBe(1.5);
  });

  it("normalizes goalie workload and results per 60 minutes", () => {
    const [point] = buildGoalieComparisonPoints([
      goalieRow(7200, 6, 5),
    ]);

    expect(point).toMatchObject({
      kind: "goalie",
      group: "aboveExpected",
      xValue: 3,
      yValue: 0.5,
      differenceValue: 0.5,
      goalsSavedAboveExpected: 1,
    });
  });

  it("filters either player comparison by its display group", () => {
    const points = buildSkaterComparisonPoints([
      skaterRow("C", 3600, 1, 1),
      skaterRow("D", 3600, 1, 1),
    ]);

    expect(filterPlayerComparisonPoints(points, "defense")).toHaveLength(1);
    expect(filterPlayerComparisonPoints(points, "all")).toHaveLength(2);
  });
});

describe("player comparison chart helpers", () => {
  it("builds padded positive and signed domains", () => {
    expect(numericDomain([0.5, 1.5])).toEqual([0.4, 1.6]);
    expect(numericDomain([2.5, 3.5], { includeZero: true })).toEqual([
      0,
      3.85,
    ]);
    expect(signedDomain([-0.5, 0.75])).toEqual([-0.84, 0.84]);
  });

  it("builds an odd, zero-centered distribution without losing values", () => {
    const bins = buildCenteredDistribution([-1, -0.2, 0, 0.4, 1], 8);

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
    gameScore: null,
    onIceExpectedGoalsPercentage: null,
    onIceCorsiPercentage: null,
    onIceFenwickPercentage: null,
    individualExpectedGoals,
    individualGoals,
    individualPoints: null,
  };
}

function goalieRow(
  iceTimeSeconds: number,
  expectedGoalsAgainst: number | null,
  goalsAgainst: number | null,
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
    expectedShotsOnGoalAgainst: null,
    shotsOnGoalAgainst: null,
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
