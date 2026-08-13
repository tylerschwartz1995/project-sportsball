import { describe, expect, it } from "vitest";

import type { LeagueTrendGame } from "@/contracts/game";
import type {
  StandingsEntry,
  StandingsPointsHistoryPoint,
} from "@/contracts/standings";
import {
  buildLeagueTrendSummary,
  buildStandingsMovement,
} from "@/lib/homepage-insights";

describe("homepage insights", () => {
  it("derives last-ten movement from cumulative standings points", () => {
    const history = Array.from({ length: 20 }, (_, index) => ({
      gameDate: `2026-01-${String(index + 1).padStart(2, "0")}`,
      nhlGameId: index + 1,
      nhlTeamId: 23,
      teamAbbreviation: "VAN",
      teamName: "Vancouver Canucks",
      gamesPlayed: index + 1,
      points: index < 10 ? index + 1 : 10 + (index - 9) * 2,
    })) satisfies StandingsPointsHistoryPoint[];

    expect(buildStandingsMovement([standing], history, 1, 10)[0]).toMatchObject({
      recentGamePoints: Array(10).fill(2),
      recentPoints: 20,
      previousPoints: 10,
      pointsChange: 10,
    });
  });

  it("keeps incomplete standings windows distinct from zero-point windows", () => {
    const history = [
      {
        gameDate: "2026-01-01",
        nhlGameId: 1,
        nhlTeamId: 23,
        teamAbbreviation: "VAN",
        teamName: "Vancouver Canucks",
        gamesPlayed: 1,
        points: 0,
      },
    ] satisfies StandingsPointsHistoryPoint[];

    expect(buildStandingsMovement([standing], history, 1, 10)[0]).toMatchObject({
      recentGamePoints: [0],
      recentPoints: null,
      previousPoints: null,
      pointsChange: null,
    });
  });

  it("compares the latest game sample with the preceding sample", () => {
    const games = [
      game(4, 3, "OT", "2026-04-04", 4),
      game(5, 1, "REG", "2026-04-03", 3),
      game(2, 1, "REG", "2026-04-02", 2),
      game(1, 3, "REG", "2026-04-01", 1),
    ];

    const result = buildLeagueTrendSummary(games, 2);

    expect(result).toMatchObject({
      currentSampleSize: 2,
      previousSampleSize: 2,
      currentStartDate: "2026-04-03",
      currentEndDate: "2026-04-04",
      highestScoringGame: { nhlGameId: 4 },
      metrics: [
        { key: "scoring", current: 6.5, previous: 3.5, change: 3 },
        { key: "home-wins", current: 1, previous: 0.5, change: 0.5 },
        { key: "one-goal", current: 0.5, previous: 0.5, change: 0 },
        { key: "extra-time", current: 0.5, previous: 0, change: 0.5 },
      ],
    });
  });
});

const standing = {
  nhlTeamId: 23,
  leagueRank: 1,
  points: 30,
} as StandingsEntry;

function game(
  homeScore: number,
  awayScore: number,
  lastPeriodType: string,
  gameDate: string,
  nhlGameId: number,
): LeagueTrendGame {
  return {
    nhlGameId,
    gameDate,
    startTimeUtc: `${gameDate}T20:00:00Z`,
    lastPeriodType,
    awayTeam: {
      abbreviation: "NJD",
      score: awayScore,
    },
    homeTeam: {
      abbreviation: "VAN",
      score: homeScore,
    },
  };
}
