import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/database", () => ({
  query: queryMock,
}));

import {
  getPlayerGameLog,
  getTeamGameLog,
  listPlayerGameSeasonIds,
} from "@/data/game-logs";

describe("game-log queries", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("maps team results and preserves nullable advanced metrics", async () => {
    queryMock.mockResolvedValue([
      {
        team_id: 8,
        nhl_team_id: 8,
        franchise_id: 1,
        abbreviation: "MTL",
        team_name: "Montréal Canadiens",
        nhl_game_id: 2025021300,
        game_date: "2026-04-10",
        game_type: 2,
        last_period_type: "OT",
        is_home: false,
        opponent_nhl_team_id: 10,
        opponent_abbreviation: "TOR",
        opponent_name: "Toronto Maple Leafs",
        score: 2,
        opponent_score: 3,
        shots_on_goal: 28,
        opponent_shots_on_goal: 31,
        x_goals_percentage: null,
        x_goals_for: null,
        x_goals_against: null,
      },
    ]);

    const result = await getTeamGameLog(8, 20252026);

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("advanced.situation = '5on5'"),
      [8, 20252026],
    );
    expect(result).toMatchObject({
      team: { nhlTeamId: 8, abbreviation: "MTL" },
      games: [
        {
          result: "OTL",
          opponent: { nhlTeamId: 10, abbreviation: "TOR" },
          fiveOnFiveXGoalsPercentage: null,
        },
      ],
    });
  });

  it("combines player profile, skater logs, and goalie logs", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          id: 1,
          nhl_player_id: 8478402,
          player_name: "Connor McDavid",
          position: "C",
          birth_date: "1997-01-13",
          birth_city: "Richmond Hill",
          birth_state_province: "ON",
          birth_country: "CAN",
          height_in_inches: 73,
          weight_in_pounds: 194,
          shoots_catches: "L",
          is_active: true,
          sweater_number: 97,
          draft_year: 2015,
          draft_team_abbrev: "EDM",
          draft_round: 1,
          draft_overall_pick: 1,
        },
      ])
      .mockResolvedValueOnce([
        {
          nhl_game_id: 2025020001,
          game_date: "2025-10-08",
          game_type: 2,
          is_home: true,
          team_nhl_team_id: 22,
          team_abbreviation: "EDM",
          team_name: "Edmonton Oilers",
          opponent_nhl_team_id: 20,
          opponent_abbreviation: "CGY",
          opponent_name: "Calgary Flames",
          team_score: 4,
          opponent_score: 2,
          goals: 1,
          assists: 2,
          points: 3,
          plus_minus: 2,
          penalty_minutes: 0,
          shots_on_goal: 5,
          hits: 1,
          blocked_shots: 0,
          time_on_ice_seconds: 1320,
          game_score: 3.2,
          individual_x_goals: 0.8,
          on_ice_x_goals_percentage: 0.62,
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await getPlayerGameLog(8478402, 20252026);

    expect(queryMock).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({
      profile: {
        name: "Connor McDavid",
        birthPlace: "Richmond Hill, ON, CAN",
      },
      skaterGames: [
        {
          points: 3,
          gameScore: 3.2,
          team: { abbreviation: "EDM" },
          opponent: { abbreviation: "CGY" },
        },
      ],
      goalieGames: [],
    });
  });

  it("computes goalie goals saved above expected", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          id: 2,
          nhl_player_id: 8471679,
          player_name: "Carey Price",
          position: "G",
          birth_date: null,
          birth_city: null,
          birth_state_province: null,
          birth_country: null,
          height_in_inches: null,
          weight_in_pounds: null,
          shoots_catches: null,
          is_active: false,
          sweater_number: 31,
          draft_year: null,
          draft_team_abbrev: null,
          draft_round: null,
          draft_overall_pick: null,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          nhl_game_id: 2015020001,
          game_date: "2015-10-07",
          game_type: 2,
          is_home: false,
          team_nhl_team_id: 8,
          team_abbreviation: "MTL",
          team_name: "Montréal Canadiens",
          opponent_nhl_team_id: 10,
          opponent_abbreviation: "TOR",
          opponent_name: "Toronto Maple Leafs",
          team_score: 3,
          opponent_score: 1,
          starter: true,
          decision: "W",
          goals_against: 1,
          shots_against: 37,
          saves: 36,
          save_percentage: 0.973,
          time_on_ice_seconds: 3600,
          expected_goals_against: 2.75,
        },
      ]);

    const result = await getPlayerGameLog(8471679, 20152016);

    expect(result?.goalieGames[0]).toMatchObject({
      goalsSavedAboveExpected: 1.75,
      decision: "W",
    });
  });

  it("lists seasons with a traditional player appearance", async () => {
    queryMock.mockResolvedValue([
      { season_id: 20252026 },
      { season_id: 20242025 },
    ]);

    await expect(listPlayerGameSeasonIds(8478402)).resolves.toEqual([
      20252026, 20242025,
    ]);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("UNION"),
      [8478402],
    );
  });
});
