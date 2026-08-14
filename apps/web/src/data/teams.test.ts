import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/database", () => ({
  query: queryMock,
}));

import {
  getTeamIdentityForSeason,
  getTeamSeasonProfile,
  listTeamsBySeason,
  listTeamSeasonIds,
} from "@/data/teams";

describe("listTeamsBySeason", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("maps historical identity and derived team totals", async () => {
    queryMock.mockResolvedValue([
      {
        team_id: 16,
        nhl_team_id: 12,
        franchise_id: 26,
        abbreviation: "CAR",
        team_name: "Carolina Hurricanes",
        season_id: 20252026,
        game_type: 2,
        games_played: 82,
        wins: 53,
        losses: 29,
        regulation_wins: 45,
        overtime_wins: 5,
        shootout_wins: 3,
        regulation_losses: 22,
        overtime_losses: 5,
        shootout_losses: 2,
        standings_points: 113,
        goals_for: 296,
        goals_against: 240,
        shots_for: 2600,
        shots_against: 2100,
      },
    ]);

    const result = await listTeamsBySeason(20252026);

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("stats.season_id = $1"),
      [20252026, 2],
    );
    expect(result[0]).toMatchObject({
      team: {
        nhlTeamId: 12,
        abbreviation: "CAR",
        name: "Carolina Hurricanes",
      },
      stats: {
        seasonId: 20252026,
        standingsPoints: 113,
        goalsFor: 296,
      },
    });
  });

  it("selects playoff team totals when requested", async () => {
    queryMock.mockResolvedValue([]);

    await listTeamsBySeason(20252026, 3);

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("stats.game_type = $2"),
      [20252026, 3],
    );
  });
});

describe("listTeamSeasonIds", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("returns only seasons in which the team has stored statistics", async () => {
    queryMock.mockResolvedValue([
      { season_id: 20252026 },
      { season_id: 20242025 },
    ]);

    await expect(listTeamSeasonIds(54)).resolves.toEqual([
      20252026,
      20242025,
    ]);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("WHERE team.nhl_id = $1"),
      [54],
    );
  });
});

describe("getTeamIdentityForSeason", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("uses the historical identity without requiring season statistics", async () => {
    queryMock.mockResolvedValue([
      {
        team_id: 7,
        nhl_team_id: 8,
        franchise_id: 1,
        abbreviation: "MTL",
        team_name: "Montréal Canadiens",
      },
    ]);

    await expect(getTeamIdentityForSeason(8, 20262027)).resolves.toEqual({
      id: 7,
      nhlTeamId: 8,
      franchiseId: 1,
      abbreviation: "MTL",
      name: "Montréal Canadiens",
    });
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("team_season.season_id = $2"),
      [8, 20262027],
    );
  });
});

describe("getTeamSeasonProfile", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("loads profile identity and totals without roster queries", async () => {
    queryMock.mockResolvedValueOnce([
      {
        team_id: 6,
        nhl_team_id: 26,
        franchise_id: 14,
        abbreviation: "LAK",
        team_name: "Los Angeles Kings",
        season_id: 20252026,
        game_type: 2,
        games_played: 82,
        wins: 42,
        losses: 30,
        regulation_wins: 36,
        overtime_wins: 4,
        shootout_wins: 2,
        regulation_losses: 25,
        overtime_losses: 5,
        shootout_losses: 0,
        standings_points: 89,
        goals_for: 240,
        goals_against: 220,
        shots_for: 2400,
        shots_against: 2300,
      },
    ]);

    await expect(getTeamSeasonProfile(26, 20252026)).resolves.toMatchObject({
      team: { nhlTeamId: 26, abbreviation: "LAK" },
      regularSeason: { gamesPlayed: 82 },
      skaters: [],
      goalies: [],
    });
    expect(queryMock).toHaveBeenCalledOnce();
    expect(queryMock.mock.calls[0]?.[0]).not.toContain(
      "official_skater_season_stats",
    );
    expect(queryMock.mock.calls[0]?.[0]).not.toContain(
      "official_goalie_season_stats",
    );
  });
});
