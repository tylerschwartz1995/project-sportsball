import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/database", () => ({
  query: queryMock,
}));

import { getDraftAnalytics } from "@/data/drafts";

describe("getDraftAnalytics", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("maps outcomes and derives team drafting production", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          nhl_player_id: 8478402,
          player_name: "Connor McDavid",
          position: "C",
          birth_country: "CAN",
          draft_year: 2015,
          draft_team_abbrev: "EDM",
          draft_round: 1,
          draft_overall_pick: 1,
          first_season_id: 20152016,
          last_season_id: 20252026,
          seasons_played: 11,
          career_games: 850,
          career_goals: 410,
          career_assists: 760,
          career_points: 1170,
          career_wins: 0,
        },
        {
          nhl_player_id: 8479999,
          player_name: "Late Pick",
          position: "D",
          birth_country: "CAN",
          draft_year: 2015,
          draft_team_abbrev: "EDM",
          draft_round: 5,
          draft_overall_pick: 130,
          first_season_id: 20182019,
          last_season_id: 20252026,
          seasons_played: 8,
          career_games: 320,
          career_goals: 20,
          career_assists: 90,
          career_points: 110,
          career_wins: 0,
        },
      ])
      .mockResolvedValueOnce([
        { draft_year: 2015, draft_team_abbrev: "EDM" },
      ]);

    const result = await getDraftAnalytics(2015, "EDM");

    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("$1::integer IS NULL"),
      [2015, "EDM"],
    );
    expect(result.outcomes[0]).toMatchObject({
      nhlPlayerId: 8478402,
      careerPoints: 1170,
    });
    expect(result.teamPerformance).toEqual([
      {
        teamAbbreviation: "EDM",
        trackedDraftees: 2,
        playersWithNhlGames: 2,
        totalGames: 1170,
        averageGames: 585,
        totalPoints: 1280,
        totalWins: 0,
        lateRoundRegulars: 1,
      },
    ]);
    expect(result.draftYears).toEqual([2015]);
    expect(result.teamAbbreviations).toEqual(["EDM"]);
  });
});
