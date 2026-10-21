import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/database", () => ({
  query: queryMock,
}));

import {
  listMoneyPuckSeasonUnits,
} from "@/data/season-units";

describe("MoneyPuck season unit queries", () => {
  beforeEach(() => {
    queryMock.mockReset();
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

  it("maps canonical players and nullable metrics for a season unit", async () => {
    queryMock.mockResolvedValue([lineRow]);
    const [unit] = await listMoneyPuckSeasonUnits(20252026, "line", { teamNhlId: 12 });
    expect(unit).toMatchObject({
      unitKey: "8478427:8478866:8482809",
      team: { abbreviation: "CAR" },
      players: [{ name: "Sebastian Aho" }, { name: "Jackson Blake" }, { name: "Andrei Svechnikov" }],
      expectedGoalsPercentage: 0.61,
    });
  });

});

const lineRow = {
  season_id: 20252026,
  unit_key: "8478427:8478866:8482809",
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
