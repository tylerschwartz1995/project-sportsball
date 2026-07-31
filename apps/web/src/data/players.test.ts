import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/database", () => ({
  query: queryMock,
}));

import {
  listPlayersBySeason,
  listSkaterLeadersBySeason,
} from "@/data/players";

describe("listPlayersBySeason", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("maps combined skater and goalie totals", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          nhl_player_id: 8478402,
          player_name: "Connor McDavid",
          position: "C",
          season_id: 20252026,
          game_type: 2,
          games_played: 82,
          teams_played_for: 1,
          goals: 48,
          assists: 90,
          points: 138,
          plus_minus: 20,
          penalty_minutes: 30,
          power_play_goals: 12,
          shots_on_goal: 300,
          hits: 40,
          blocked_shots: 25,
          time_on_ice_seconds: 100000,
        },
      ])
      .mockResolvedValueOnce([
        {
          nhl_player_id: 8475883,
          player_name: "Frederik Andersen",
          position: "G",
          season_id: 20252026,
          game_type: 2,
          games_played: 30,
          teams_played_for: 1,
          games_started: 28,
          wins: 20,
          losses: 8,
          overtime_losses: 2,
          goals_against: 70,
          shots_against: 800,
          saves: 730,
          save_percentage: 0.9125,
          time_on_ice_seconds: 100000,
        },
      ]);

    const result = await listPlayersBySeason(20252026);

    expect(result).toMatchObject({
      seasonId: 20252026,
      skaters: [
        {
          kind: "skater",
          nhlPlayerId: 8478402,
          points: 138,
        },
      ],
      goalies: [
        {
          kind: "goalie",
          nhlPlayerId: 8475883,
          savePercentage: 0.9125,
        },
      ],
    });
    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("stats.game_type = $2"),
      [20252026, 2],
    );
  });

  it("selects playoff skater and goalie totals when requested", async () => {
    queryMock.mockResolvedValue([]);

    await listPlayersBySeason(20252026, 3);

    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("stats.game_type = $2"),
      [20252026, 3],
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("stats.game_type = $2"),
      [20252026, 3],
    );
  });

  it("loads only the requested number of skater leaders", async () => {
    queryMock.mockResolvedValueOnce([
      {
        nhl_player_id: 8478402,
        player_name: "Connor McDavid",
        position: "C",
        season_id: 20252026,
        game_type: 2,
        games_played: 82,
        teams_played_for: 1,
        goals: 48,
        assists: 90,
        points: 138,
        plus_minus: 20,
        penalty_minutes: 30,
        power_play_goals: 12,
        shots_on_goal: 300,
        hits: 40,
        blocked_shots: 25,
        time_on_ice_seconds: 100000,
      },
    ]);

    const leaders = await listSkaterLeadersBySeason(20252026, 5);

    expect(leaders).toHaveLength(1);
    expect(leaders[0]?.points).toBe(138);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("LIMIT $3"),
      [20252026, 2, 5],
    );
  });

  it("bounds an excessive leader limit", async () => {
    queryMock.mockResolvedValueOnce([]);

    await listSkaterLeadersBySeason(20252026, 10_000);

    expect(queryMock).toHaveBeenCalledWith(expect.any(String), [20252026, 2, 100]);
  });
});
