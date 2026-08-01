import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/database", () => ({
  query: queryMock,
}));

import { getTeamScheduleStrength } from "@/data/schedule-strength";

describe("getTeamScheduleStrength", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("maps time-aware opponent ratings and schedule context", async () => {
    queryMock.mockResolvedValue([
      {
        nhl_game_id: 2025020001,
        game_date: "2025-10-08",
        start_time_utc: "2025-10-09T02:00:00.000Z",
        state: "FINAL",
        completed: true,
        is_home: true,
        opponent_nhl_team_id: 10,
        opponent_abbreviation: "TOR",
        opponent_name: "Toronto Maple Leafs",
        team_score: 4,
        opponent_score: 2,
        opponent_prior_games: 3,
        opponent_results_season_id: 20252026,
        opponent_expected_goals_season_id: 20252026,
        opponent_points_percentage: 0.667,
        opponent_goal_differential_per_game: 1.25,
        opponent_expected_goals_percentage: 0.532,
        rest_days: 1,
        is_back_to_back: false,
      },
    ]);

    const result = await getTeamScheduleStrength(23, 20252026);

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("< (schedule.start_time_utc, schedule.id)"),
      [23, 20252026],
    );
    expect(result).toEqual({
      seasonId: 20252026,
      teamNhlId: 23,
      games: [
        {
          nhlGameId: 2025020001,
          gameDate: "2025-10-08",
          startTimeUtc: "2025-10-09T02:00:00.000Z",
          state: "FINAL",
          completed: true,
          isHome: true,
          opponentNhlTeamId: 10,
          opponentAbbreviation: "TOR",
          opponentName: "Toronto Maple Leafs",
          teamScore: 4,
          opponentScore: 2,
          opponentPriorGames: 3,
          opponentResultsSeasonId: 20252026,
          opponentExpectedGoalsSeasonId: 20252026,
          opponentPointsPercentage: 0.667,
          opponentGoalDifferentialPerGame: 1.25,
          opponentExpectedGoalsPercentage: 0.532,
          restDays: 1,
          isBackToBack: false,
          siteName: "Vancouver, BC",
          travelDistanceKm: 0,
        },
      ],
    });
  });
});
