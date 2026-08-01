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

  it("uses complete selection denominators for team performance", async () => {
    queryMock
      .mockResolvedValueOnce([
        { draft_year: 2015, draft_team_abbrev: "EDM" },
      ])
      .mockResolvedValueOnce([
        outcomeRow({
          nhl_player_id: 8478402,
          player_name: "Connor McDavid",
          draft_overall_pick: 1,
          career_games: 850,
          career_goals: 410,
          career_assists: 760,
          career_points: 1170,
          seasons_played: 11,
          first_season_id: 20152016,
          last_season_id: 20252026,
        }),
        outcomeRow({
          nhl_player_id: 8479999,
          player_name: "Late Pick",
          draft_round: 5,
          draft_pick_in_round: 10,
          draft_overall_pick: 130,
          career_games: 320,
          career_goals: 20,
          career_assists: 90,
          career_points: 110,
          seasons_played: 8,
          first_season_id: 20182019,
          last_season_id: 20252026,
        }),
        outcomeRow({
          nhl_player_id: null,
          player_name: "Never Appeared",
          draft_round: 7,
          draft_pick_in_round: 20,
          draft_overall_pick: 210,
        }),
      ]);

    const result = await getDraftAnalytics(2015, "EDM");

    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("FROM draft_selections AS selection"),
      [2015, "EDM"],
    );
    expect(queryMock.mock.calls[1]?.[0]).toContain(
      "historical_skater_season_stats",
    );
    expect(result.outcomes[0]).toMatchObject({
      nhlPlayerId: 8478402,
      careerPoints: 1170,
    });
    expect(result.outcomes[2]).toMatchObject({
      nhlPlayerId: null,
      careerGames: 0,
    });
    expect(result.teamPerformance).toEqual([
      {
        teamAbbreviation: "EDM",
        selections: 3,
        playersWithNhlGames: 2,
        appearanceRate: 2 / 3,
        hundredGamePlayers: 2,
        hundredGameRate: 2 / 3,
        totalGames: 1170,
        averageGames: 390,
        totalPoints: 1280,
        totalWins: 0,
        lateRoundRegulars: 1,
      },
    ]);
    expect(result.draftYears).toEqual([2015]);
    expect(result.selectedDraftYear).toBe(2015);
    expect(result.teamAbbreviations).toEqual(["EDM"]);
  });

  it("uses the latest board with outcomes by default and supports all years", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          draft_year: 2026,
          draft_team_abbrev: "VAN",
          has_nhl_appearance: false,
        },
        {
          draft_year: 2025,
          draft_team_abbrev: "VAN",
          has_nhl_appearance: true,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          draft_year: 2026,
          draft_team_abbrev: "VAN",
          has_nhl_appearance: false,
        },
      ])
      .mockResolvedValueOnce([]);

    const latest = await getDraftAnalytics();
    const all = await getDraftAnalytics(null, null, true);

    expect(queryMock.mock.calls[1]?.[1]).toEqual([2025, null]);
    expect(queryMock.mock.calls[3]?.[1]).toEqual([null, null]);
    expect(latest.selectedDraftYear).toBe(2025);
    expect(all).toMatchObject({ selectedDraftYear: null, allYears: true });
  });
});

function outcomeRow(
  overrides: Partial<Record<string, unknown>>,
): Record<string, unknown> {
  return {
    nhl_player_id: 8470000,
    player_name: "Test Player",
    position: "C",
    birth_country: "CAN",
    amateur_league: "OHL",
    amateur_club_name: "London",
    draft_year: 2015,
    draft_team_abbrev: "EDM",
    original_pick_owner_abbrev: "EDM",
    pick_owner_history: "EDM",
    draft_round: 1,
    draft_pick_in_round: 1,
    draft_overall_pick: 1,
    removed_outright: false,
    removed_outright_reason: null,
    first_season_id: null,
    last_season_id: null,
    seasons_played: 0,
    career_games: 0,
    career_goals: 0,
    career_assists: 0,
    career_points: 0,
    career_wins: 0,
    ...overrides,
  };
}
