import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/database", () => ({
  query: queryMock,
}));

import { getMoneyPuckGameAnalytics } from "@/data/advanced-game";

describe("MoneyPuck advanced game query", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("maps game, player, shot, line, and pairing records", async () => {
    queryMock
      .mockResolvedValueOnce([gameRow])
      .mockResolvedValueOnce([teamSituationRow])
      .mockResolvedValueOnce([skaterSituationRow])
      .mockResolvedValueOnce([goalieSituationRow])
      .mockResolvedValueOnce([shotRow])
      .mockResolvedValueOnce([lineRow, pairingRow]);

    const result = await getMoneyPuckGameAnalytics(2025021312);

    expect(queryMock).toHaveBeenCalledTimes(6);
    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("FROM games AS game"),
      [2025021312],
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining("FROM moneypuck_shots AS stats"),
      [2025021312],
    );
    expect(result).toMatchObject({
      game: {
        nhlGameId: 2025021312,
        awayTeam: { abbreviation: "CAR" },
        homeTeam: { abbreviation: "VGK" },
      },
      teamSituations: [
        {
          team: { abbreviation: "CAR" },
          expectedGoalsPercentage: 0.57,
        },
      ],
      skaterSituations: [
        {
          player: { nhlPlayerId: 8482809, name: "Jackson Blake" },
          gameScore: 2.4,
        },
      ],
      goalieSituations: [
        {
          player: { name: "Brandon Bussi" },
          expectedGoalsAgainst: 1.82,
        },
      ],
      shots: [
        {
          shooter: { name: "Jackson Blake" },
          goalie: null,
          adjustedXCoordinate: 74,
          expectedGoal: 0.21,
        },
      ],
      forwardLines: [
        {
          unitType: "line",
          players: [
            { name: "Jackson Blake" },
            { name: "Sebastian Aho" },
            { name: "Andrei Svechnikov" },
          ],
        },
      ],
      defensivePairings: [
        {
          unitType: "pairing",
          players: [{ name: "Jaccob Slavin" }, { name: "Brent Burns" }],
        },
      ],
    });
  });

  it("returns null for an unknown NHL game", async () => {
    queryMock.mockResolvedValue([]);

    await expect(getMoneyPuckGameAnalytics(2099020999)).resolves.toBeNull();
    expect(queryMock).toHaveBeenCalledTimes(6);
  });

  it("rejects an unexpected unit type instead of silently misclassifying it", async () => {
    queryMock
      .mockResolvedValueOnce([gameRow])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...pairingRow, unit_type: "unknown" }]);

    await expect(getMoneyPuckGameAnalytics(2025021312)).rejects.toThrow(
      "Unknown MoneyPuck unit type: unknown",
    );
  });
});

const gameRow = {
  nhl_game_id: 2025021312,
  season_id: 20252026,
  game_type: 2,
  game_date: "2026-04-16",
  away_nhl_team_id: 12,
  away_abbreviation: "CAR",
  away_name: "Carolina Hurricanes",
  home_nhl_team_id: 54,
  home_abbreviation: "VGK",
  home_name: "Vegas Golden Knights",
};

const teamFields = {
  team_nhl_id: 12,
  team_abbreviation: "CAR",
  team_name: "Carolina Hurricanes",
  opponent_nhl_id: 54,
  opponent_abbreviation: "VGK",
  opponent_name: "Vegas Golden Knights",
};

const teamSituationRow = {
  ...teamFields,
  situation: "5on5",
  is_home: false,
  playoff_game: false,
  ice_time_seconds: 2900,
  x_goals_percentage: 0.57,
  corsi_percentage: 0.55,
  fenwick_percentage: 0.54,
  x_goals_for: 2.2,
  x_goals_against: 1.7,
  goals_for: 3,
  goals_against: 1,
  shots_on_goal_for: 28,
  shots_on_goal_against: 24,
  shot_attempts_for: 53,
  shot_attempts_against: 45,
  high_danger_x_goals_for: 1.1,
  high_danger_x_goals_against: 0.7,
};

const playerFields = {
  ...teamFields,
  situation: "all",
  is_home: false,
  ice_time_seconds: 1100,
};

const skaterSituationRow = {
  ...playerFields,
  nhl_player_id: 8482809,
  player_name: "Jackson Blake",
  position: "R",
  shifts: 20,
  game_score: 2.4,
  on_ice_x_goals_percentage: 0.62,
  on_ice_corsi_percentage: 0.6,
  on_ice_fenwick_percentage: 0.59,
  individual_x_goals: 0.8,
  individual_goals: 1,
  individual_points: 2,
  individual_shot_attempts: 6,
  primary_assists: 1,
  secondary_assists: 0,
  shots_on_goal: 4,
  hits: 1,
  takeaways: 1,
  giveaways: 0,
  on_ice_x_goals_for: 2.1,
  on_ice_x_goals_against: 1.2,
};

const goalieSituationRow = {
  ...playerFields,
  nhl_player_id: 8481035,
  player_name: "Brandon Bussi",
  expected_goals_against: 1.82,
  goals_against: 1,
  shots_on_goal_against: 24,
  expected_shots_on_goal_against: 23.2,
  expected_rebounds: 2.1,
  rebounds: 2,
  expected_freezes: 8.3,
  freezes: 9,
  low_danger_x_goals_against: 0.42,
  medium_danger_x_goals_against: 0.6,
  high_danger_x_goals_against: 0.8,
};

const shotRow = {
  ...teamFields,
  source_shot_id: "12345",
  source_event_index: 202,
  shooter_nhl_id: 8482809,
  shooter_name: "Jackson Blake",
  goalie_nhl_id: null,
  goalie_name: null,
  event_type: "GOAL",
  period: 2,
  time_in_period_seconds: 422,
  is_home_team: false,
  is_playoff_game: false,
  is_goal: true,
  was_on_goal: true,
  shot_type: "Wrist",
  location: "Slot",
  x_coord: 74,
  y_coord: 4,
  x_coord_adjusted: 74,
  y_coord_adjusted: 4,
  shot_distance: 15.5,
  shot_angle: 12.2,
  x_goal: 0.21,
  x_rebound: 0.05,
  generated_rebound: false,
  was_rebound: false,
  was_rush: true,
  was_off_wing: false,
  was_empty_net: false,
  home_skaters_on_ice: 5,
  away_skaters_on_ice: 5,
  home_team_goals: 1,
  away_team_goals: 2,
  time_since_last_event: 4.2,
  distance_from_last_event: 38,
};

const unitMetrics = {
  ...teamFields,
  situation: "5on5",
  is_home: false,
  ice_time_seconds: 620,
  ice_time_rank: 1,
  x_goals_percentage: 0.64,
  corsi_percentage: 0.62,
  fenwick_percentage: 0.61,
  x_goals_for: 1.3,
  x_goals_against: 0.7,
  goals_for: 2,
  goals_against: 0,
  shots_on_goal_for: 12,
  shots_on_goal_against: 8,
  high_danger_x_goals_for: 0.8,
  high_danger_x_goals_against: 0.3,
};

const lineRow = {
  ...unitMetrics,
  source_line_id: "aho-blake-svechnikov",
  name: "Aho-Blake-Svechnikov",
  unit_type: "line",
  player_1_nhl_id: 8482809,
  player_1_name: "Jackson Blake",
  player_2_nhl_id: 8478427,
  player_2_name: "Sebastian Aho",
  player_3_nhl_id: 8478427,
  player_3_name: "Andrei Svechnikov",
};

const pairingRow = {
  ...unitMetrics,
  source_line_id: "slavin-burns",
  name: "Slavin-Burns",
  unit_type: "pairing",
  player_1_nhl_id: 8476958,
  player_1_name: "Jaccob Slavin",
  player_2_nhl_id: 8470613,
  player_2_name: "Brent Burns",
  player_3_nhl_id: null,
  player_3_name: null,
};
