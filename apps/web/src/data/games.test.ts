import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/database", () => ({
  query: queryMock,
}));

import {
  getGameBoxScore,
  getGamesByDate,
  getLatestGamesForSeason,
  getRecentCompletedGames,
  getUpcomingGamesForTeamAcrossSeasons,
  getUpcomingGames,
  listGameDates,
  listScheduleTeams,
} from "@/data/games";

describe("game queries", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("lists schedule dates using the query's upcoming-first order", async () => {
    queryMock.mockResolvedValue([
      { game_date: "2026-06-14", game_count: 1 },
      { game_date: "2026-06-11", game_count: 1 },
    ]);

    await expect(listGameDates(20252026)).resolves.toEqual([
      { date: "2026-06-14", gameCount: 1 },
      { date: "2026-06-11", gameCount: 1 },
    ]);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("game_date >= CURRENT_DATE"),
      [20252026, null, null],
    );
  });

  it("maps both teams and nullable result fields for one game", async () => {
    queryMock.mockResolvedValue([
      {
        id: 42,
        nhl_game_id: 2025030416,
        season_id: 20252026,
        game_type: 3,
        game_date: "2026-06-14",
        start_time_utc: "2026-06-14 00:00:00+00",
        state: "OFF",
        last_period_type: "REG",
        away_team_id: 7,
        away_nhl_team_id: 12,
        away_abbreviation: "CAR",
        away_name: "Carolina Hurricanes",
        away_wins: 16,
        away_losses: 6,
        away_overtime_losses: 0,
        away_score: 3,
        away_shots_on_goal: 29,
        home_team_id: 31,
        home_nhl_team_id: 54,
        home_abbreviation: "VGK",
        home_name: "Vegas Golden Knights",
        home_wins: 14,
        home_losses: 8,
        home_overtime_losses: 0,
        home_score: 0,
        home_shots_on_goal: 24,
      },
    ]);

    const result = await getGamesByDate(20252026, "2026-06-14");

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("game.game_date = $2::date"),
      [20252026, "2026-06-14", null],
    );
    const gameQuery = queryMock.mock.calls[0]?.[0] as string;
    expect(gameQuery).toContain("record_game.game_type = game.game_type");
    expect(gameQuery).toContain("<= (game.start_time_utc, game.nhl_id)");
    expect(gameQuery).toContain("IN ('OT', 'SO')");
    expect(result[0]).toMatchObject({
      nhlGameId: 2025030416,
      gameType: 3,
      awayTeam: {
        abbreviation: "CAR",
        record: { wins: 16, losses: 6, overtimeLosses: 0 },
        score: 3,
      },
      homeTeam: {
        abbreviation: "VGK",
        record: { wins: 14, losses: 8, overtimeLosses: 0 },
        score: 0,
      },
    });
  });

  it("filters dates and games by season phase when requested", async () => {
    queryMock.mockResolvedValue([]);

    await listGameDates(20252026, 3);
    await getGamesByDate(20252026, "2026-06-14", 3);

    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("game_type = $2"),
      [20252026, 3, null],
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("game.game_type = $3"),
      [20252026, "2026-06-14", 3],
    );
  });

  it("limits schedule dates to a selected team", async () => {
    queryMock.mockResolvedValue([]);

    await listGameDates(20252026, 2, 23);

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("away_team_id"),
      [20252026, 2, 23],
    );
    expect(queryMock.mock.calls[0]?.[0]).toContain("home_team_id");
  });

  it("lists teams from scheduled games without requiring season stats", async () => {
    queryMock.mockResolvedValue([
      {
        team_id: 7,
        nhl_team_id: 22,
        franchise_id: 25,
        abbreviation: "EDM",
        team_name: "Edmonton Oilers",
      },
    ]);

    await expect(listScheduleTeams(20262027, 2)).resolves.toEqual([
      {
        id: 7,
        nhlTeamId: 22,
        franchiseId: 25,
        abbreviation: "EDM",
        name: "Edmonton Oilers",
      },
    ]);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("SELECT away_team_id AS team_id"),
      [20262027, 2],
    );
    expect(queryMock.mock.calls[0]?.[0]).toContain(
      "SELECT home_team_id AS team_id",
    );
  });

  it("loads the latest game date for a season without a second query", async () => {
    queryMock.mockResolvedValue([]);

    await expect(getLatestGamesForSeason(20252026)).resolves.toEqual([]);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("SELECT MAX(latest.game_date)"),
      [20252026],
    );
  });

  it("loads a bounded recent completed-game sample", async () => {
    queryMock.mockResolvedValue([]);

    await getRecentCompletedGames(20252026, 2, 500.8);

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("recent.state IN ('FINAL', 'OFF')"),
      [20252026, 2, 120],
    );
    const recentQuery = queryMock.mock.calls[0]?.[0] as string;
    expect(recentQuery).toContain("WITH recent_games AS MATERIALIZED");
    expect(recentQuery).toContain("JOIN recent_games");
    expect(recentQuery.match(/LIMIT \$3/g)).toHaveLength(1);
    expect(recentQuery).toContain("ORDER BY game.start_time_utc DESC");
  });

  it("loads a team's future schedule across season boundaries", async () => {
    queryMock.mockResolvedValue([]);

    await getUpcomingGamesForTeamAcrossSeasons(8, 10);

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("game.start_time_utc > NOW()"),
      [8, 10],
    );
    expect(queryMock.mock.calls[0]?.[0]).not.toContain(
      "WHERE game.season_id = $2",
    );
  });

  it("loads the next league games without a season boundary", async () => {
    queryMock.mockResolvedValue([]);
    await getUpcomingGames(6);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("game.start_time_utc > NOW()"),
      [6],
    );
  });

  it("groups skaters and goalies under the correct box-score team", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          id: 42,
          nhl_game_id: 2025030416,
          season_id: 20252026,
          game_type: 3,
          game_date: "2026-06-14",
          start_time_utc: "2026-06-14 00:00:00+00",
          state: "OFF",
          last_period_type: "REG",
          away_team_id: 16,
          away_nhl_team_id: 12,
          away_abbreviation: "CAR",
          away_name: "Carolina Hurricanes",
          away_wins: 16,
          away_losses: 6,
          away_overtime_losses: 0,
          away_score: 3,
          away_shots_on_goal: 23,
          home_team_id: 11096,
          home_nhl_team_id: 54,
          home_abbreviation: "VGK",
          home_name: "Vegas Golden Knights",
          home_wins: 14,
          home_losses: 8,
          home_overtime_losses: 0,
          home_score: 0,
          home_shots_on_goal: 22,
        },
      ])
      .mockResolvedValueOnce([
        {
          team_id: 16,
          nhl_player_id: 8482809,
          player_name: "Jackson Blake",
          sweater_number: 53,
          position: "R",
          goals: 1,
          assists: 1,
          points: 2,
          plus_minus: 2,
          penalty_minutes: 0,
          hits: 1,
          power_play_goals: 0,
          shots_on_goal: 3,
          faceoff_win_percentage: null,
          blocked_shots: 0,
          giveaways: 0,
          takeaways: 1,
          shifts: 20,
          time_on_ice_seconds: 872,
        },
      ])
      .mockResolvedValueOnce([
        {
          team_id: 16,
          nhl_player_id: 8481035,
          player_name: "Brandon Bussi",
          sweater_number: 32,
          starter: true,
          decision: "W",
          goals_against: 0,
          shots_against: 22,
          saves: 22,
          save_percentage: 1,
          even_strength_goals_against: 0,
          even_strength_saves: 18,
          power_play_goals_against: 0,
          power_play_saves: 4,
          shorthanded_goals_against: 0,
          shorthanded_saves: 0,
          time_on_ice_seconds: 3600,
        },
      ]);

    const result = await getGameBoxScore(2025030416);

    expect(queryMock).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({
      nhlGameId: 2025030416,
      awayTeam: {
        abbreviation: "CAR",
        record: { wins: 16, losses: 6, overtimeLosses: 0 },
        skaters: [
          {
            nhlPlayerId: 8482809,
            name: "Jackson Blake",
            points: 2,
          },
        ],
        goalies: [
          {
            name: "Brandon Bussi",
            decision: "W",
            saves: 22,
          },
        ],
      },
      homeTeam: {
        abbreviation: "VGK",
        record: { wins: 14, losses: 8, overtimeLosses: 0 },
        skaters: [],
        goalies: [],
      },
    });
  });
});
