import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/database", () => ({
  query: queryMock,
}));

import {
  getMoneyPuckSeasonUnitLeaders,
  listMoneyPuckSeasonUnits,
} from "@/data/season-units";

describe("MoneyPuck season unit queries", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("loads lines and pairings in parallel and maps canonical identities", async () => {
    queryMock
      .mockResolvedValueOnce([lineRow])
      .mockResolvedValueOnce([{ ...lineRow, unit_type: "pairing", player_3_nhl_id: null, player_3_name: null }]);

    const result = await getMoneyPuckSeasonUnitLeaders(20252026, {
      minimumIceTimeSeconds: 12_000,
    });

    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("FROM moneypuck_unit_season_stats AS stats"),
      [20252026, "line", 12_000, null, 100],
    );
    expect(result.forwardLines[0]).toMatchObject({
      team: { abbreviation: "CAR" },
      players: [
        { name: "Sebastian Aho" },
        { name: "Jackson Blake" },
        { name: "Andrei Svechnikov" },
      ],
      expectedGoalsPercentage: 0.61,
    });
    expect(result.defensivePairings[0]?.players).toHaveLength(2);
  });

  it("passes a team filter and bounded limit", async () => {
    queryMock.mockResolvedValue([]);

    await listMoneyPuckSeasonUnits(20252026, "line", {
      teamNhlId: 12,
      minimumIceTimeSeconds: -10,
      limit: 900,
    });

    expect(queryMock).toHaveBeenCalledWith(expect.any(String), [
      20252026,
      "line",
      0,
      12,
      500,
    ]);
  });
});

const lineRow = {
  season_id: 20252026,
  team_id: 12,
  nhl_team_id: 12,
  franchise_id: 26,
  abbreviation: "CAR",
  team_name: "Carolina Hurricanes",
  unit_type: "line",
  player_1_nhl_id: 8478427,
  player_1_name: "Sebastian Aho",
  player_2_nhl_id: 8482809,
  player_2_name: "Jackson Blake",
  player_3_nhl_id: 8478866,
  player_3_name: "Andrei Svechnikov",
  games_played: 40,
  ice_time_seconds: 18_000,
  x_goals_percentage: 0.61,
  corsi_percentage: 0.58,
  x_goals_for: 20,
  x_goals_against: 13,
  goals_for: 18,
  goals_against: 11,
  shots_on_goal_for: 190,
  shots_on_goal_against: 140,
  high_danger_x_goals_for: 10,
  high_danger_x_goals_against: 6,
};
