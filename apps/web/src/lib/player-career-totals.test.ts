import { describe, expect, it } from "vitest";

import {
  goalieCareerTotals,
  skaterCareerTotals,
} from "@/lib/player-career-totals";

describe("player career totals", () => {
  it("sums additive skater statistics", () => {
    expect(
      skaterCareerTotals([
        {
          gamesPlayed: 82,
          goals: 29,
          assists: 72,
          points: 101,
          plusMinus: 37,
          penaltyMinutes: 28,
        },
        {
          gamesPlayed: 82,
          goals: 30,
          assists: 59,
          points: 89,
          plusMinus: 19,
          penaltyMinutes: 8,
        },
      ]),
    ).toEqual({
      gamesPlayed: 164,
      goals: 59,
      assists: 131,
      points: 190,
      plusMinus: 56,
      penaltyMinutes: 36,
    });
  });

  it("derives goalie save percentage from career saves and shots", () => {
    expect(
      goalieCareerTotals([
        {
          gamesPlayed: 40,
          gamesStarted: 38,
          wins: 24,
          losses: 10,
          overtimeLosses: 4,
          saves: 900,
          shotsAgainst: 1_000,
        },
        {
          gamesPlayed: 20,
          gamesStarted: 18,
          wins: 8,
          losses: 8,
          overtimeLosses: 2,
          saves: 480,
          shotsAgainst: 500,
        },
      ]),
    ).toEqual({
      gamesPlayed: 60,
      gamesStarted: 56,
      wins: 32,
      losses: 18,
      overtimeLosses: 6,
      saves: 1_380,
      shotsAgainst: 1_500,
      savePercentage: 0.92,
    });
  });

  it("leaves goalie save percentage unavailable without shots", () => {
    expect(goalieCareerTotals([]).savePercentage).toBeNull();
  });
});
