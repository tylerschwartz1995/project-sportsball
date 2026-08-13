import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/database", () => ({
  query: queryMock,
}));

import {
  listGoalieDirectoryPage,
  listPlayersBySeason,
  listSkaterDirectoryPage,
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
          teams: [
            {
              id: 22,
              nhlTeamId: 22,
              franchiseId: 25,
              abbreviation: "EDM",
              name: "Edmonton Oilers",
            },
          ],
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
          teams: [
            {
              id: 12,
              nhlTeamId: 12,
              franchiseId: 26,
              abbreviation: "CAR",
              name: "Carolina Hurricanes",
            },
          ],
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
          teams: [
            expect.objectContaining({ abbreviation: "EDM" }),
          ],
        },
      ],
      goalies: [
        {
          kind: "goalie",
          nhlPlayerId: 8475883,
          savePercentage: 0.9125,
          teams: [
            expect.objectContaining({ abbreviation: "CAR" }),
          ],
        },
      ],
    });
    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("stats.game_type = $2"),
      [20252026, 2],
    );
    expect(queryMock.mock.calls[0]?.[0]).toContain(
      "official_skater_season_stats",
    );
    expect(queryMock.mock.calls[1]?.[0]).toContain(
      "official_goalie_season_stats",
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
        teams: [
          {
            id: 22,
            nhlTeamId: 22,
            franchiseId: 25,
            abbreviation: "EDM",
            name: "Edmonton Oilers",
          },
        ],
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

  it("filters and paginates skaters in PostgreSQL", async () => {
    queryMock
      .mockResolvedValueOnce([{ total: "51" }])
      .mockResolvedValueOnce([
        { country: "CAN", region: "Ontario", city: "Toronto" },
      ])
      .mockResolvedValueOnce([
        {
          nhl_player_id: 8478402,
          player_name: "Connor McDavid",
          position: "C",
          season_id: 20252026,
          game_type: 2,
          games_played: 82,
          teams_played_for: 1,
          teams: [],
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

    const result = await listSkaterDirectoryPage({
      seasonId: 20252026,
      query: "center",
      position: "F",
      sort: "points",
      direction: "desc",
      requestedPage: 2,
      pageSize: 50,
      minGames: 10,
      minGoals: 1,
      minAssists: 2,
      minPoints: 3,
      country: "CAN",
      region: "Ontario",
      city: "Toronto",
    });

    expect(result).toMatchObject({
      currentPage: 2,
      totalPages: 2,
      totalItems: 51,
      firstItem: 51,
      lastItem: 51,
      locations: [{ country: "CAN", region: "Ontario", city: "Toronto" }],
      items: [{ kind: "skater", nhlPlayerId: 8478402 }],
    });
    expect(queryMock).toHaveBeenCalledTimes(3);
    expect(queryMock.mock.calls[0]?.[0]).toContain("COUNT(*)");
    expect(queryMock.mock.calls[0]?.[0]).toContain("= ANY(");
    expect(queryMock.mock.calls[1]?.[1]).toEqual([20252026, 2]);
    expect(queryMock.mock.calls[2]?.[0]).toContain(
      "ORDER BY stats.points DESC, stats.goals DESC",
    );
    expect(queryMock.mock.calls[2]?.[0]).toContain("LIMIT $12");
    expect(queryMock.mock.calls[2]?.[1]).toEqual([
      20252026,
      2,
      "center",
      "CAN",
      "Ontario",
      "Toronto",
      ["C", "L", "R"],
      10,
      1,
      2,
      3,
      50,
      50,
    ]);
  });

  it("clamps an out-of-range goalie page and allowlists sort SQL", async () => {
    queryMock
      .mockResolvedValueOnce([{ total: "1" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await listGoalieDirectoryPage({
      seasonId: 20252026,
      gameType: 3,
      query: "",
      sort: "stats.wins; DROP TABLE players",
      direction: "asc",
      requestedPage: 99,
      minGames: 0,
      minWins: 0,
      minSavePercentage: 0,
      country: "",
      region: "",
      city: "",
    });

    expect(result.currentPage).toBe(1);
    expect(queryMock.mock.calls[2]?.[0]).toContain(
      "ORDER BY stats.save_percentage ASC NULLS FIRST",
    );
    expect(queryMock.mock.calls[2]?.[0]).not.toContain("DROP TABLE");
    expect(queryMock.mock.calls[2]?.[1]).toEqual([20252026, 3, 50, 0]);
  });
});
