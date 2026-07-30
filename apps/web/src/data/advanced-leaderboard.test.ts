import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/database", () => ({
  query: queryMock,
}));

import {
  listAdvancedGoalieLeaders,
  listAdvancedSkaterLeaders,
  listAdvancedTeamLeaders,
} from "@/data/advanced-leaderboard";

describe("advanced leaderboard queries", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("maps team five-on-five results with historical identity", async () => {
    queryMock.mockResolvedValue([
      {
        team_id: 1,
        nhl_team_id: 21,
        franchise_id: 16,
        abbreviation: "COL",
        team_name: "Colorado Avalanche",
        situation: "5on5",
        games_played: 82,
        ice_time_seconds: 240000,
        x_goals_percentage: 0.56,
        corsi_percentage: 0.54,
        fenwick_percentage: 0.55,
        x_goals_for: 180,
        x_goals_against: 141,
        goals_for: 201,
        goals_against: 130,
      },
    ]);

    const result = await listAdvancedTeamLeaders(20252026, "5on5");

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("stats.situation = $2"),
      [20252026, "5on5"],
    );
    expect(result[0]).toMatchObject({
      team: { nhlTeamId: 21, abbreviation: "COL" },
      expectedGoalsPercentage: 0.56,
    });
  });

  it("applies the skater ice-time threshold and maps player-team rows", async () => {
    queryMock.mockResolvedValue([
      {
        nhl_player_id: 8478402,
        player_name: "Connor McDavid",
        position: "C",
        team_id: 2,
        nhl_team_id: 22,
        franchise_id: 25,
        abbreviation: "EDM",
        team_name: "Edmonton Oilers",
        situation: "5on5",
        games_played: 82,
        ice_time_seconds: 80000,
        game_score: 135.8,
        on_ice_x_goals_percentage: 0.56,
        on_ice_corsi_percentage: 0.55,
        on_ice_fenwick_percentage: 0.54,
        individual_x_goals: 21.7,
        individual_goals: 20,
        individual_points: 80,
      },
    ]);

    const result = await listAdvancedSkaterLeaders(
      20252026,
      "5on5",
      18000,
    );

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("stats.ice_time_seconds >= $3"),
      [20252026, "5on5", 18000],
    );
    expect(result[0]).toMatchObject({
      player: { nhlPlayerId: 8478402, name: "Connor McDavid" },
      team: { abbreviation: "EDM" },
      gameScore: 135.8,
    });
  });

  it("returns computed goalie goals saved above expected", async () => {
    queryMock.mockResolvedValue([
      {
        nhl_player_id: 8475809,
        player_name: "Scott Wedgewood",
        position: "G",
        team_id: 1,
        nhl_team_id: 21,
        franchise_id: 16,
        abbreviation: "COL",
        team_name: "Colorado Avalanche",
        situation: "all",
        games_played: 45,
        ice_time_seconds: 150000,
        expected_goals_against: 110,
        goals_against: 98,
        goals_saved_above_expected: 12,
        expected_shots_on_goal_against: 1200,
        shots_on_goal_against: 1180,
      },
    ]);

    const result = await listAdvancedGoalieLeaders(20252026, "all", 36000);

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("goals_saved_above_expected"),
      [20252026, "all", 36000],
    );
    expect(result[0]).toMatchObject({
      player: { name: "Scott Wedgewood" },
      goalsSavedAboveExpected: 12,
    });
  });
});
