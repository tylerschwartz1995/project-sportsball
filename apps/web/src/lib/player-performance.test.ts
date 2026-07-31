import { describe, expect, it } from "vitest";

import type {
  GoaliePerformanceGame,
  SkaterPerformanceGame,
} from "@/lib/player-performance";
import {
  buildRollingGoaliePerformance,
  buildRollingSkaterPerformance,
} from "@/lib/player-performance";

const identity = {
  isHome: true,
  team: {
    nhlTeamId: 22,
    abbreviation: "EDM",
    name: "Edmonton Oilers",
  },
  opponent: {
    nhlTeamId: 20,
    abbreviation: "CGY",
    name: "Calgary Flames",
  },
  teamScore: 4,
  opponentScore: 2,
};

describe("buildRollingSkaterPerformance", () => {
  it("calculates rolling rates from chronological game totals", () => {
    const games: SkaterPerformanceGame[] = [
      {
        ...identity,
        nhlGameId: 2,
        gameDate: "2025-10-02",
        points: 0,
        individualXGoals: 0.2,
      },
      {
        ...identity,
        nhlGameId: 1,
        gameDate: "2025-10-01",
        points: 2,
        individualXGoals: 0.8,
      },
    ];

    const result = buildRollingSkaterPerformance(games, 5);

    expect(result.map((point) => point.nhlGameId)).toEqual([1, 2]);
    expect(result[1]).toMatchObject({
      sampleSize: 2,
      advancedSampleSize: 2,
      pointsPerGame: 1,
      individualExpectedGoalsPerGame: 0.5,
    });
  });

  it("excludes missing xG games from the advanced denominator", () => {
    const games: SkaterPerformanceGame[] = [
      {
        ...identity,
        nhlGameId: 1,
        gameDate: "2025-10-01",
        points: 1,
        individualXGoals: 0.6,
      },
      {
        ...identity,
        nhlGameId: 2,
        gameDate: "2025-10-02",
        points: 1,
        individualXGoals: null,
      },
    ];

    const finalPoint = buildRollingSkaterPerformance(games, 5).at(-1);

    expect(finalPoint?.advancedSampleSize).toBe(1);
    expect(finalPoint?.individualExpectedGoalsPerGame).toBeCloseTo(0.6);
  });
});

describe("buildRollingGoaliePerformance", () => {
  it("derives save percentage from rolling saves and shots", () => {
    const games: GoaliePerformanceGame[] = [
      {
        ...identity,
        nhlGameId: 1,
        gameDate: "2025-10-01",
        saves: 27,
        shotsAgainst: 30,
        goalsSavedAboveExpected: 0.8,
      },
      {
        ...identity,
        nhlGameId: 2,
        gameDate: "2025-10-02",
        saves: 19,
        shotsAgainst: 20,
        goalsSavedAboveExpected: -0.2,
      },
    ];

    const finalPoint = buildRollingGoaliePerformance(games, 5).at(-1);

    expect(finalPoint?.savePercentage).toBeCloseTo(92);
    expect(finalPoint?.goalsSavedAboveExpectedPerGame).toBeCloseTo(0.3);
    expect(finalPoint?.scoreLabel).toBe("4–2");
  });

  it("returns a missing advanced rate when GSAx is unavailable", () => {
    const game: GoaliePerformanceGame = {
      ...identity,
      nhlGameId: 1,
      gameDate: "2007-10-01",
      saves: 30,
      shotsAgainst: 32,
      goalsSavedAboveExpected: null,
    };

    const point = buildRollingGoaliePerformance([game], 10)[0];

    expect(point.savePercentage).toBeCloseTo(93.75);
    expect(point.goalsSavedAboveExpectedPerGame).toBeNull();
    expect(point.advancedSampleSize).toBe(0);
  });
});
