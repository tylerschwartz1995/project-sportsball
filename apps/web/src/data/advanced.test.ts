import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/database", () => ({
  query: queryMock,
}));

import {
  getMoneyPuckPlayerSeason,
  getMoneyPuckTeamSeason,
} from "@/data/advanced";

describe("MoneyPuck application queries", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("maps team situation metrics and historical identity", async () => {
    queryMock.mockResolvedValue([
      {
        team_id: 16,
        nhl_team_id: 12,
        franchise_id: 26,
        abbreviation: "CAR",
        team_name: "Carolina Hurricanes",
        season_id: 20252026,
        situation: "5on5",
        games_played: 82,
        ice_time_seconds: 250000,
        x_goals_percentage: 0.56,
        corsi_percentage: 0.55,
        fenwick_percentage: 0.54,
        x_goals_for: 180.2,
        x_goals_against: 142.1,
        goals_for: 190,
        goals_against: 150,
        shot_attempts_for: 4100,
        shot_attempts_against: 3500,
      },
    ]);

    const result = await getMoneyPuckTeamSeason(12, 20252026);

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("moneypuck_team_season_stats"),
      [12, 20252026],
    );
    expect(result).toMatchObject({
      team: { abbreviation: "CAR" },
      situations: [
        {
          situation: "5on5",
          expectedGoalsPercentage: 0.56,
          shotAttemptsFor: 4100,
        },
      ],
    });
  });

  it("maps skater and goalie situation metrics", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          nhl_team_id: 22,
          abbreviation: "EDM",
          team_name: "Edmonton Oilers",
          situation: "all",
          games_played: 82,
          ice_time_seconds: 100000,
          game_score: 120,
          on_ice_x_goals_percentage: 0.61,
          on_ice_corsi_percentage: 0.6,
          on_ice_fenwick_percentage: 0.59,
          individual_x_goals: 50,
          individual_goals: 48,
          individual_points: 138,
          individual_shot_attempts: 500,
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await getMoneyPuckPlayerSeason(8478402, 20252026);

    expect(result).toMatchObject({
      nhlPlayerId: 8478402,
      skaterSituations: [
        {
          team: { abbreviation: "EDM" },
          gameScore: 120,
          onIceExpectedGoalsPercentage: 0.61,
        },
      ],
      goalieSituations: [],
    });
    expect(queryMock).toHaveBeenCalledTimes(2);
  });
});
