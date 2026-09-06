import "server-only";

import type {
  ScheduleStrengthGame,
  TeamScheduleStrength,
} from "@/contracts/schedule-strength";
import { query } from "@/data/database";
import { calculateScheduleTravel } from "@/lib/travel";

type ScheduleStrengthRow = {
  nhl_game_id: number;
  game_date: string;
  start_time_utc: string;
  state: string;
  completed: boolean;
  is_home: boolean;
  opponent_nhl_team_id: number;
  opponent_abbreviation: string;
  opponent_name: string;
  team_score: number | null;
  opponent_score: number | null;
  opponent_prior_games: number;
  opponent_results_season_id: number | null;
  opponent_expected_goals_season_id: number | null;
  opponent_points_percentage: number | null;
  opponent_goal_differential_per_game: number | null;
  opponent_expected_goals_percentage: number | null;
  rest_days: number | null;
  is_back_to_back: boolean;
};

export async function getTeamScheduleStrength(
  nhlTeamId: number,
  seasonId: number,
): Promise<TeamScheduleStrength> {
  const rows = await query<ScheduleStrengthRow>(
    `
      SELECT
        game.nhl_id::integer AS nhl_game_id,
        game.game_date::text AS game_date,
        game.start_time_utc::text AS start_time_utc,
        game.state,
        game.state IN ('FINAL', 'OFF') AND team_stats.score IS NOT NULL
          AND opponent_stats.score IS NOT NULL AS completed,
        game.home_team_id = team.id AS is_home,
        opponent.nhl_id::integer AS opponent_nhl_team_id,
        COALESCE(opponent_season.abbreviation, opponent.abbreviation) AS opponent_abbreviation,
        COALESCE(opponent_season.full_name, opponent.name) AS opponent_name,
        team_stats.score AS team_score,
        opponent_stats.score AS opponent_score,
        context.opponent_prior_games,
        context.opponent_results_season_id,
        context.opponent_expected_goals_season_id,
        context.opponent_points_percentage,
        context.opponent_goal_differential_per_game,
        context.opponent_expected_goals_percentage,
        context.rest_days,
        context.is_back_to_back
      FROM games AS game
      JOIN teams AS team ON team.nhl_id = $1
        AND team.id IN (game.home_team_id, game.away_team_id)
      JOIN teams AS opponent ON opponent.id = CASE
        WHEN game.home_team_id = team.id THEN game.away_team_id ELSE game.home_team_id END
      JOIN schedule_game_context AS context ON context.game_id = game.id
        AND context.team_id = team.id AND context.definition_version = 'schedule-context-v1'
      LEFT JOIN team_seasons AS opponent_season
        ON opponent_season.team_id = opponent.id AND opponent_season.season_id = $2
      LEFT JOIN team_game_stats AS team_stats
        ON team_stats.game_id = game.id AND team_stats.team_id = team.id
      LEFT JOIN team_game_stats AS opponent_stats
        ON opponent_stats.game_id = game.id AND opponent_stats.team_id = opponent.id
      WHERE game.season_id = $2 AND game.game_type = 2
        AND ((game.state IN ('FINAL', 'OFF') AND team_stats.score IS NOT NULL
          AND opponent_stats.score IS NOT NULL) OR game.start_time_utc > NOW())
      ORDER BY game.start_time_utc, game.nhl_id
    `,
    [nhlTeamId, seasonId],
  );

  const games = rows.map(mapScheduleStrengthGame);
  const travel = calculateScheduleTravel(nhlTeamId, games);
  return {
    seasonId,
    teamNhlId: nhlTeamId,
    games: games.map((game, index) => ({
      ...game,
      ...travel[index],
    })),
  };
}

function mapScheduleStrengthGame(
  row: ScheduleStrengthRow,
): ScheduleStrengthGame {
  return {
    nhlGameId: row.nhl_game_id,
    gameDate: row.game_date,
    startTimeUtc: row.start_time_utc,
    state: row.state,
    completed: row.completed,
    isHome: row.is_home,
    opponentNhlTeamId: row.opponent_nhl_team_id,
    opponentAbbreviation: row.opponent_abbreviation,
    opponentName: row.opponent_name,
    teamScore: row.team_score,
    opponentScore: row.opponent_score,
    opponentPriorGames: row.opponent_prior_games,
    opponentResultsSeasonId: row.opponent_results_season_id,
    opponentExpectedGoalsSeasonId: row.opponent_expected_goals_season_id,
    opponentPointsPercentage: row.opponent_points_percentage,
    opponentGoalDifferentialPerGame:
      row.opponent_goal_differential_per_game,
    opponentExpectedGoalsPercentage:
      row.opponent_expected_goals_percentage,
    restDays: row.rest_days,
    isBackToBack: row.is_back_to_back,
    siteName: null,
    travelDistanceKm: null,
  };
}
