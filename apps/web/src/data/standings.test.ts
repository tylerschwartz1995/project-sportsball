import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/database", () => ({
  query: queryMock,
}));

import { getStandings } from "@/data/standings";

describe("getStandings", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("uses a parameterized query and maps a standings row", async () => {
    queryMock.mockResolvedValue([
      {
        snapshot_date: "2025-04-17",
        season_id: 20242025,
        team_id: 1,
        nhl_team_id: 10,
        team_abbreviation: "TOR",
        team_name: "Toronto Maple Leafs",
        conference_name: "Eastern",
        division_name: "Atlantic",
        games_played: 82,
        wins: 52,
        losses: 26,
        overtime_losses: 4,
        points: 108,
        regulation_wins: 42,
        regulation_plus_overtime_wins: 49,
        goals_for: 268,
        goals_against: 231,
        goal_differential: 37,
        point_percentage: 0.659,
        league_rank: 4,
        conference_rank: 2,
        division_rank: 1,
        wildcard_rank: 0,
        clinch_indicator: "x",
      },
    ]);

    const result = await getStandings(20242025);

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("WHERE standings.season_id = $1"),
      [20242025],
    );
    expect(result).toEqual([
      {
        snapshotDate: "2025-04-17",
        seasonId: 20242025,
        teamId: 1,
        nhlTeamId: 10,
        teamAbbreviation: "TOR",
        teamName: "Toronto Maple Leafs",
        conferenceName: "Eastern",
        divisionName: "Atlantic",
        gamesPlayed: 82,
        wins: 52,
        losses: 26,
        overtimeLosses: 4,
        points: 108,
        regulationWins: 42,
        regulationPlusOvertimeWins: 49,
        goalsFor: 268,
        goalsAgainst: 231,
        goalDifferential: 37,
        pointPercentage: 0.659,
        leagueRank: 4,
        conferenceRank: 2,
        divisionRank: 1,
        wildcardRank: 0,
        clinchIndicator: "x",
      },
    ]);
  });
});
