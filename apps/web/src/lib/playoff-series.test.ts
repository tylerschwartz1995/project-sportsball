import { describe, expect, it } from "vitest";

import type { PlayoffSeries } from "@/contracts/playoffs";
import { summarizePlayoffSeries } from "@/lib/playoff-series";

describe("summarizePlayoffSeries", () => {
  it("aggregates official scores, shots, and close-game context", () => {
    const summary = summarizePlayoffSeries(series());

    expect(summary).toMatchObject({
      gamesPlayed: 2,
      overtimeGames: 1,
      oneGoalGames: 1,
      teamOne: { goals: 7, shotsOnGoal: 65, wins: 2 },
      teamTwo: { goals: 4, shotsOnGoal: 59, wins: 0 },
    });
    expect(summary?.teamOne.shotShare).toBeCloseTo(65 / 124);
    expect(summary?.teamTwo.goalsPerGame).toBe(2);
  });

  it("keeps shot aggregates unavailable when one box score lacks shots", () => {
    const input = series();
    input.games[1].homeTeam.shotsOnGoal = null;

    const summary = summarizePlayoffSeries(input);

    expect(summary?.teamTwo.shotsOnGoal).toBeNull();
    expect(summary?.teamOne.shotShare).toBeNull();
  });
});

function series(): PlayoffSeries {
  return {
    id: "1-1",
    round: 1,
    matchup: 1,
    teamOne: {
      nhlTeamId: 12,
      abbreviation: "CAR",
      name: "Carolina Hurricanes",
      seedLabel: null,
    },
    teamTwo: {
      nhlTeamId: 1,
      abbreviation: "NJD",
      name: "New Jersey Devils",
      seedLabel: null,
    },
    teamOneWins: 2,
    teamTwoWins: 0,
    winnerNhlTeamId: null,
    teamAnalytics: [],
    playerLeaders: [],
    games: [
      {
        nhlGameId: 2024030111,
        gameDate: "2025-04-20",
        startTimeUtc: "2025-04-20T23:00:00Z",
        state: "FINAL",
        lastPeriodType: "OT",
        awayTeam: {
          nhlTeamId: 1,
          abbreviation: "NJD",
          name: "New Jersey Devils",
          score: 2,
          shotsOnGoal: 29,
        },
        homeTeam: {
          nhlTeamId: 12,
          abbreviation: "CAR",
          name: "Carolina Hurricanes",
          score: 3,
          shotsOnGoal: 31,
        },
      },
      {
        nhlGameId: 2024030112,
        gameDate: "2025-04-22",
        startTimeUtc: "2025-04-22T23:00:00Z",
        state: "FINAL",
        lastPeriodType: "REG",
        awayTeam: {
          nhlTeamId: 12,
          abbreviation: "CAR",
          name: "Carolina Hurricanes",
          score: 4,
          shotsOnGoal: 34,
        },
        homeTeam: {
          nhlTeamId: 1,
          abbreviation: "NJD",
          name: "New Jersey Devils",
          score: 2,
          shotsOnGoal: 30,
        },
      },
    ],
  };
}
