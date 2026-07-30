import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/database", () => ({
  query: queryMock,
}));

import { getGamesByDate, listGameDates } from "@/data/games";

describe("game queries", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("lists game dates newest first with a parameterized season", async () => {
    queryMock.mockResolvedValue([
      { game_date: "2026-06-14", game_count: 1 },
      { game_date: "2026-06-11", game_count: 1 },
    ]);

    await expect(listGameDates(20252026)).resolves.toEqual([
      { date: "2026-06-14", gameCount: 1 },
      { date: "2026-06-11", gameCount: 1 },
    ]);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("WHERE season_id = $1"),
      [20252026],
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
        away_score: 3,
        away_shots_on_goal: 29,
        home_team_id: 31,
        home_nhl_team_id: 54,
        home_abbreviation: "VGK",
        home_name: "Vegas Golden Knights",
        home_score: 0,
        home_shots_on_goal: 24,
      },
    ]);

    const result = await getGamesByDate(20252026, "2026-06-14");

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("game.game_date = $2::date"),
      [20252026, "2026-06-14"],
    );
    expect(result[0]).toMatchObject({
      nhlGameId: 2025030416,
      gameType: 3,
      awayTeam: {
        abbreviation: "CAR",
        score: 3,
      },
      homeTeam: {
        abbreviation: "VGK",
        score: 0,
      },
    });
  });
});
