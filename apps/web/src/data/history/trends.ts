import type {
  HistoryOverview
} from "@/contracts/history";
import { query } from "@/data/database";
import "server-only";
export async function getHistoryLeagueTrend(
  gameType: number,
): Promise<HistoryOverview["leagueTrend"]> {
  const rows = await query<{
    season_id: number;
    goals_per_team_game: number;
    points_per_team_game: number;
    wins_per_team_game: number;
    goalie_save_percentage: number | null;
    goalie_goals_against_average: number | null;
  }>(`
    WITH team_rates AS (
      SELECT
        season_id,
        (SUM(goals_for)::numeric / NULLIF(SUM(games_played), 0))::float AS goals_per_team_game,
        (SUM(points)::numeric / NULLIF(SUM(games_played), 0))::float AS points_per_team_game,
        (SUM(wins)::numeric / NULLIF(SUM(games_played), 0))::float AS wins_per_team_game
      FROM historical_team_season_stats
      WHERE game_type = $1
      GROUP BY season_id
    ), goalie_rates AS (
      SELECT
        season_id,
        (
          SUM(saves) FILTER (WHERE saves IS NOT NULL AND shots_against > 0)::numeric /
          NULLIF(SUM(shots_against) FILTER (WHERE saves IS NOT NULL AND shots_against > 0), 0)
        )::float AS goalie_save_percentage,
        (
          3600 * SUM(goals_against) FILTER (WHERE time_on_ice_seconds > 0)::numeric /
          NULLIF(SUM(time_on_ice_seconds) FILTER (WHERE time_on_ice_seconds > 0), 0)
        )::float AS goalie_goals_against_average
      FROM historical_goalie_season_stats
      WHERE game_type = $1
      GROUP BY season_id
    )
    SELECT team_rates.*, goalie_rates.goalie_save_percentage, goalie_rates.goalie_goals_against_average
    FROM team_rates
    LEFT JOIN goalie_rates USING (season_id)
    ORDER BY season_id
  `, [gameType]);
  return rows.map((row) => ({
    seasonId: row.season_id,
    goalsPerTeamGame: row.goals_per_team_game,
    pointsPerTeamGame: row.points_per_team_game,
    winsPerTeamGame: row.wins_per_team_game,
    goalieSavePercentage: row.goalie_save_percentage,
    goalieGoalsAgainstAverage: row.goalie_goals_against_average,
  }));
}
