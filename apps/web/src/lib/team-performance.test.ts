import { describe, expect, it } from "vitest";

import type { TeamGameLogEntry } from "@/contracts/game-log";
import {
  buildRollingTeamPerformance,
  filterTeamPerformanceGames,
} from "@/lib/team-performance";

const games: TeamGameLogEntry[] = [
  makeGame({
    nhlGameId: 3,
    gameDate: "2025-10-03",
    score: 1,
    opponentScore: 3,
    xGoalsFor: null,
    xGoalsAgainst: null,
  }),
  makeGame({
    nhlGameId: 1,
    gameDate: "2025-10-01",
    score: 4,
    opponentScore: 2,
    xGoalsFor: 3,
    xGoalsAgainst: 2,
  }),
  makeGame({
    nhlGameId: 2,
    gameDate: "2025-10-02",
    score: 2,
    opponentScore: 2,
    xGoalsFor: 1,
    xGoalsAgainst: 3,
  }),
];

describe("buildRollingTeamPerformance", () => {
  it("sorts games chronologically and grows an early rolling window", () => {
    const result = buildRollingTeamPerformance(games, 5);

    expect(result.map((point) => point.nhlGameId)).toEqual([1, 2, 3]);
    expect(result.map((point) => point.sampleSize)).toEqual([1, 2, 3]);
    expect(result[0].goalSharePercentage).toBeCloseTo(66.67, 1);
    expect(result[2].goalSharePercentage).toBeCloseTo(50, 5);
  });

  it("aggregates xG totals without treating missing advanced data as zero", () => {
    const result = buildRollingTeamPerformance(games, 5);
    const finalPoint = result.at(-1);

    expect(finalPoint?.advancedSampleSize).toBe(2);
    expect(finalPoint?.fiveOnFiveExpectedGoalSharePercentage).toBeCloseTo(
      44.44,
      1,
    );
  });

  it("limits calculations to the selected number of games", () => {
    const result = buildRollingTeamPerformance(games, 5);
    const extended = [
      ...games,
      makeGame({
        nhlGameId: 4,
        gameDate: "2025-10-04",
        score: 5,
        opponentScore: 0,
        xGoalsFor: 4,
        xGoalsAgainst: 1,
      }),
      makeGame({
        nhlGameId: 5,
        gameDate: "2025-10-05",
        score: 5,
        opponentScore: 0,
        xGoalsFor: 4,
        xGoalsAgainst: 1,
      }),
      makeGame({
        nhlGameId: 6,
        gameDate: "2025-10-06",
        score: 5,
        opponentScore: 0,
        xGoalsFor: 4,
        xGoalsAgainst: 1,
      }),
    ];
    const finalPoint = buildRollingTeamPerformance(extended, 5).at(-1);

    expect(result).toHaveLength(3);
    expect(finalPoint?.sampleSize).toBe(5);
    expect(finalPoint?.goalSharePercentage).toBeCloseTo(78.26, 1);
  });
});

describe("filterTeamPerformanceGames", () => {
  const venueGames = [
    makeGame({
      nhlGameId: 10,
      gameDate: "2025-11-01",
      score: 3,
      opponentScore: 1,
      xGoalsFor: 2,
      xGoalsAgainst: 1,
      isHome: true,
    }),
    makeGame({
      nhlGameId: 11,
      gameDate: "2025-11-02",
      score: 1,
      opponentScore: 3,
      xGoalsFor: 1,
      xGoalsAgainst: 2,
      isHome: false,
    }),
  ];

  it("keeps all games when venue is not restricted", () => {
    expect(filterTeamPerformanceGames(venueGames, "all")).toHaveLength(2);
  });

  it("filters before a rolling series is calculated", () => {
    const awayGames = filterTeamPerformanceGames(venueGames, "away");
    const rollingAway = buildRollingTeamPerformance(awayGames, 10);

    expect(rollingAway).toHaveLength(1);
    expect(rollingAway[0]).toMatchObject({
      nhlGameId: 11,
      sampleSize: 1,
      venueLabel: "at",
    });
  });
});

function makeGame({
  nhlGameId,
  gameDate,
  score,
  opponentScore,
  xGoalsFor,
  xGoalsAgainst,
  isHome = true,
}: {
  nhlGameId: number;
  gameDate: string;
  score: number;
  opponentScore: number;
  xGoalsFor: number | null;
  xGoalsAgainst: number | null;
  isHome?: boolean;
}): TeamGameLogEntry {
  return {
    nhlGameId,
    gameDate,
    gameType: 2,
    lastPeriodType: "REG",
    isHome,
    opponent: {
      nhlTeamId: 10,
      abbreviation: "TOR",
      name: "Toronto Maple Leafs",
    },
    score,
    opponentScore,
    result: score > opponentScore ? "W" : score === opponentScore ? "OTL" : "L",
    shotsOnGoal: 30,
    opponentShotsOnGoal: 28,
    fiveOnFiveXGoalsPercentage:
      xGoalsFor === null || xGoalsAgainst === null
        ? null
        : xGoalsFor / (xGoalsFor + xGoalsAgainst),
    fiveOnFiveXGoalsFor: xGoalsFor,
    fiveOnFiveXGoalsAgainst: xGoalsAgainst,
  };
}
