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
        {
          draft_year: 2015,
          draft_team_nhl_id: 22,
          draft_team_name: "Edmonton Oilers",
          draft_team_abbrev: "EDM",
          has_nhl_appearance: true,
        },
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
          career_game_score: 1480.25,
          career_individual_x_goals: 365.5,
          career_on_ice_x_goals_percentage: 0.61,
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
          career_game_score: 200,
        }),
        outcomeRow({
          nhl_player_id: null,
          player_name: "Never Appeared",
          draft_round: 7,
          draft_pick_in_round: 20,
          draft_overall_pick: 210,
        }),
      ]);

    const result = await getDraftAnalytics({
      draftYear: 2015,
      teamAbbreviation: "EDM",
      includeAdvanced: true,
    });

    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("FROM draft_selections AS selection"),
      [2015, "EDM", null, null, true],
    );
    expect(queryMock.mock.calls[1]?.[0]).toContain(
      "historical_skater_season_stats",
    );
    expect(result.outcomes[0]).toMatchObject({
      nhlPlayerId: 8478402,
      careerPoints: 1170,
      careerGameScore: 1480.25,
      careerIndividualExpectedGoals: 365.5,
      careerOnIceExpectedGoalsPercentage: 0.61,
    });
    expect(result.outcomes[2]).toMatchObject({
      nhlPlayerId: null,
      careerGames: 0,
    });
    expect(result.teamPerformance).toEqual([
      {
        teamNhlId: 22,
        teamName: "Edmonton Oilers",
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
        valueAboveExpected: 0,
        lateRoundSelections: 2,
        lateRoundRegulars: 1,
        lateRoundHitRate: 0.5,
        goalieSelections: 0,
        goalieHits: 0,
        goalieHitRate: null,
        gameScorePerSkaterPick: (1480.25 + 200) / 3,
      },
    ]);
    expect(result.classPerformance).toEqual([
      {
        draftYear: 2015,
        selections: 3,
        playersWithNhlGames: 2,
        appearanceRate: 2 / 3,
        hundredGamePlayers: 2,
        hundredGameRate: 2 / 3,
        fiveHundredGamePlayers: 1,
        fiveHundredGameRate: 1 / 3,
        totalGames: 1170,
        averageGames: 390,
        skaterSelections: 3,
        totalSkaterPoints: 1280,
        pointsPerSkaterPick: 1280 / 3,
        gameScorePerSkaterPick: (1480.25 + 200) / 3,
      },
    ]);
    expect(result.draftYears).toEqual([2015]);
    expect(result.selectedDraftYear).toBe(2015);
    expect(result.teamOptions).toEqual([
      {
        nhlTeamId: 22,
        name: "Edmonton Oilers",
        abbreviation: "EDM",
      },
    ]);
  });

  it("uses view-appropriate defaults and supports all years", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          draft_year: 2026,
          draft_team_nhl_id: 23,
          draft_team_name: "Vancouver Canucks",
          draft_team_abbrev: "VAN",
          has_nhl_appearance: false,
        },
        {
          draft_year: 2025,
          draft_team_nhl_id: 23,
          draft_team_name: "Vancouver Canucks",
          draft_team_abbrev: "VAN",
          has_nhl_appearance: true,
        },
        {
          draft_year: 2021,
          draft_team_nhl_id: 23,
          draft_team_name: "Vancouver Canucks",
          draft_team_abbrev: "VAN",
          has_nhl_appearance: true,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          draft_year: 2026,
          draft_team_nhl_id: 23,
          draft_team_name: "Vancouver Canucks",
          draft_team_abbrev: "VAN",
          has_nhl_appearance: false,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          draft_year: 2026,
          draft_team_nhl_id: 23,
          draft_team_name: "Vancouver Canucks",
          draft_team_abbrev: "VAN",
          has_nhl_appearance: false,
        },
        {
          draft_year: 2021,
          draft_team_nhl_id: 23,
          draft_team_name: "Vancouver Canucks",
          draft_team_abbrev: "VAN",
          has_nhl_appearance: true,
        },
      ])
      .mockResolvedValueOnce([]);

    const latest = await getDraftAnalytics();
    const all = await getDraftAnalytics({ allYears: true });
    const mature = await getDraftAnalytics({ defaultYear: "mature" });

    expect(queryMock.mock.calls[1]?.[1]).toEqual([
      2026,
      null,
      null,
      null,
      false,
    ]);
    expect(queryMock.mock.calls[3]?.[1]).toEqual([
      null,
      null,
      null,
      null,
      false,
    ]);
    expect(queryMock.mock.calls[5]?.[1]).toEqual([
      2021,
      null,
      null,
      null,
      false,
    ]);
    expect(latest.selectedDraftYear).toBe(2026);
    expect(all).toMatchObject({ selectedDraftYear: null, allYears: true });
    expect(mature).toMatchObject({
      selectedDraftYear: 2021,
      latestMatureDraftYear: 2021,
    });
  });

  it("adjusts team value for draft position and separates goalie outcomes", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          draft_year: 2015,
          draft_team_nhl_id: 22,
          draft_team_name: "Edmonton Oilers",
          draft_team_abbrev: "EDM",
          has_nhl_appearance: true,
        },
        {
          draft_year: 2015,
          draft_team_nhl_id: 52,
          draft_team_name: "Winnipeg Jets",
          draft_team_abbrev: "WPG",
          has_nhl_appearance: true,
        },
      ])
      .mockResolvedValueOnce([
        outcomeRow({
          player_name: "Goalie Hit",
          position: "G",
          draft_team_nhl_id: 22,
          draft_team_name: "Edmonton Oilers",
          draft_team_abbrev: "EDM",
          draft_overall_pick: 1,
          career_games: 100,
        }),
        outcomeRow({
          player_name: "Skater Hit",
          position: "C",
          draft_team_nhl_id: 52,
          draft_team_name: "Winnipeg Jets",
          draft_team_abbrev: "WPG",
          draft_overall_pick: 2,
          career_games: 300,
          career_game_score: 500,
        }),
      ]);

    const result = await getDraftAnalytics({
      draftYear: 2015,
      includeAdvanced: true,
    });

    expect(result.teamPerformance).toEqual([
      expect.objectContaining({
        teamAbbreviation: "WPG",
        valueAboveExpected: 100,
        goalieHitRate: null,
        gameScorePerSkaterPick: 500,
      }),
      expect.objectContaining({
        teamAbbreviation: "EDM",
        valueAboveExpected: -100,
        goalieSelections: 1,
        goalieHits: 1,
        goalieHitRate: 1,
        gameScorePerSkaterPick: null,
      }),
    ]);
  });

  it("keeps incomplete class Game Score coverage unavailable", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          draft_year: 2011,
          draft_team_nhl_id: 22,
          draft_team_name: "Edmonton Oilers",
          draft_team_abbrev: "EDM",
          has_nhl_appearance: false,
        },
        {
          draft_year: 2010,
          draft_team_nhl_id: 22,
          draft_team_name: "Edmonton Oilers",
          draft_team_abbrev: "EDM",
          has_nhl_appearance: true,
        },
      ])
      .mockResolvedValueOnce([
        outcomeRow({
          draft_year: 2011,
          player_name: "Zero Game Skater",
          career_games: 0,
          career_game_score: null,
        }),
        outcomeRow({
          draft_year: 2010,
          player_name: "Missing Coverage Skater",
          career_games: 100,
          career_game_score: null,
        }),
      ]);

    const result = await getDraftAnalytics({
      allYears: true,
      includeAdvanced: true,
    });

    expect(result.classPerformance).toEqual([
      expect.objectContaining({
        draftYear: 2011,
        gameScorePerSkaterPick: 0,
      }),
      expect.objectContaining({
        draftYear: 2010,
        gameScorePerSkaterPick: null,
      }),
    ]);
  });

  it("limits team options to the selected draft year", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          draft_year: 2016,
          draft_team_nhl_id: 52,
          draft_team_name: "Winnipeg Jets",
          draft_team_abbrev: "WPG",
          has_nhl_appearance: true,
        },
        {
          draft_year: 2015,
          draft_team_nhl_id: 22,
          draft_team_name: "Edmonton Oilers",
          draft_team_abbrev: "EDM",
          has_nhl_appearance: true,
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await getDraftAnalytics({
      draftYear: 2015,
      teamAbbreviation: "WPG",
    });

    expect(queryMock.mock.calls[1]?.[1]).toEqual([
      2015,
      null,
      null,
      null,
      false,
    ]);
    expect(result.teamOptions).toEqual([
      {
        nhlTeamId: 22,
        name: "Edmonton Oilers",
        abbreviation: "EDM",
      },
    ]);
    expect(result.selectedTeamAbbreviation).toBeNull();
  });

  it("normalizes the default mature team comparison window", async () => {
    queryMock
      .mockResolvedValueOnce(
        [
          ...Array.from({ length: 15 }, (_, index) => ({
            draft_year: 2026 - index,
            draft_team_nhl_id: 23,
            draft_team_name: "Vancouver Canucks",
            draft_team_abbrev: "VAN",
            has_nhl_appearance: index > 0,
          })),
          {
            draft_year: 2000,
            draft_team_nhl_id: 11,
            draft_team_name: "Atlanta Thrashers",
            draft_team_abbrev: "ATL",
            has_nhl_appearance: true,
          },
        ],
      )
      .mockResolvedValueOnce([]);

    const result = await getDraftAnalytics({
      yearRange: true,
      fromYear: 2026,
      toYear: 2025,
      includeAdvanced: true,
    });

    expect(queryMock.mock.calls[1]?.[1]).toEqual([
      null,
      null,
      2012,
      2021,
      true,
    ]);
    expect(result).toMatchObject({
      selectedDraftYear: null,
      selectedFromYear: 2012,
      selectedToYear: 2021,
    });
    expect(result.teamOptions).toEqual([
      {
        nhlTeamId: 23,
        name: "Vancouver Canucks",
        abbreviation: "VAN",
      },
    ]);
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
    draft_team_nhl_id: 22,
    draft_team_name: "Edmonton Oilers",
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
    career_game_score: null,
    career_individual_x_goals: null,
    career_on_ice_x_goals_percentage: null,
    career_goals_saved_above_expected: null,
    ...overrides,
  };
}
