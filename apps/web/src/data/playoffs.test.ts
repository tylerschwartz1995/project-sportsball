import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/database", () => ({
  query: queryMock,
}));

import {
  getPlayoffSeriesInsights,
  getPlayoffSeriesPlayerStats,
} from "@/data/playoffs";

describe("playoff series queries", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("loads only compact team analytics with the initial bracket", async () => {
    queryMock.mockResolvedValue([
      {
        round: 1,
        matchup: 5,
        nhl_team_id: 52,
        team_abbreviation: "WPG",
        team_name: "Winnipeg Jets",
        situation: "all",
        games: 7,
        expected_goals_for: "22.21",
        expected_goals_against: "18.52",
        shot_attempts_for: "410",
        shot_attempts_against: "346",
      },
    ]);

    const result = await getPlayoffSeriesInsights(20242025);

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(result[0]).toMatchObject({
      id: "1-5",
      teamAnalytics: [
        {
          abbreviation: "WPG",
          allSituations: {
            expectedGoalsFor: 22.21,
            expectedGoalsShare: 22.21 / (22.21 + 18.52),
          },
        },
      ],
    });
  });

  it("loads official and shot-model player stats in parallel for one series", async () => {
    queryMock
      .mockResolvedValueOnce([skaterRow])
      .mockResolvedValueOnce([goalieRow])
      .mockResolvedValueOnce([advancedSkaterRow])
      .mockResolvedValueOnce([advancedGoalieRow]);

    const result = await getPlayoffSeriesPlayerStats(20242025, 1, 5);

    expect(queryMock).toHaveBeenCalledTimes(4);
    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("FROM player_game_stats AS stats"),
      [20242025, 1, 5],
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(
        /COALESCE\(stats\.time_on_ice_seconds, 0\) > 0[\s\S]*FROM goalie_game_stats AS stats[\s\S]*HAVING COALESCE\(SUM\(stats\.time_on_ice_seconds\), 0\) > 0/,
      ),
      [20242025, 1, 5],
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("FROM moneypuck_shots AS stats"),
      [20242025, 1, 5],
    );
    expect(result.skaters[0]).toMatchObject({
      name: "Kyle Connor",
      points: 12,
      shotsOnGoal: 25,
    });
    expect(result.goalies[0].savePercentage).toBeCloseTo(180 / 195);
    expect(result.advancedSkaters[0]).toMatchObject({
      expectedGoals: 3.5,
      goalsAboveExpected: 0.5,
      shootingPercentage: 4 / 25,
    });
    expect(result.advancedGoalies[0]).toMatchObject({
      saves: 180,
      expectedGoalsAgainst: 16.8,
    });
    expect(result.advancedGoalies[0].goalsSavedAboveExpected).toBeCloseTo(1.8);
  });
});

const identity = {
  nhl_player_id: 8478398,
  player_name: "Kyle Connor",
  nhl_team_id: 52,
  team_abbreviation: "WPG",
};

const skaterRow = {
  ...identity,
  position: "L",
  games_played: 7,
  goals: 4,
  assists: 8,
  points: 12,
  plus_minus: 2,
  penalty_minutes: 4,
  hits: 5,
  power_play_goals: 1,
  shots_on_goal: 25,
  blocked_shots: 3,
  takeaways: 2,
  giveaways: 4,
  time_on_ice_seconds: 8_400,
};

const goalieRow = {
  ...identity,
  games_played: 7,
  games_started: 7,
  wins: 4,
  losses: 3,
  goals_against: 15,
  shots_against: 195,
  saves: 180,
  time_on_ice_seconds: 25_200,
};

const advancedSkaterRow = {
  ...identity,
  shot_attempts: 42,
  shots_on_goal: 25,
  goals: 4,
  expected_goals: "3.5",
  average_shot_distance: "24.2",
  rush_attempts: 6,
  rebound_attempts: 3,
};

const advancedGoalieRow = {
  ...identity,
  shots_against: 195,
  goals_against: 15,
  expected_goals_against: "16.8",
};
