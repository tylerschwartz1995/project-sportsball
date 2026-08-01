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
      WITH previous_season AS (
        SELECT MAX(id) AS id
        FROM seasons
        WHERE id < $2
      ),
      team_schedule AS (
        SELECT
          game.id,
          game.nhl_id,
          game.game_date,
          game.start_time_utc,
          game.state,
          game.home_team_id = team.id AS is_home,
          CASE
            WHEN game.home_team_id = team.id THEN game.away_team_id
            ELSE game.home_team_id
          END AS opponent_team_id,
          team_stats.score AS team_score,
          opponent_stats.score AS opponent_score,
          game.state IN ('FINAL', 'OFF')
            AND team_stats.score IS NOT NULL
            AND opponent_stats.score IS NOT NULL AS completed,
          LAG(game.game_date) OVER (
            ORDER BY game.start_time_utc, game.nhl_id
          ) AS previous_game_date
        FROM games AS game
        JOIN teams AS team
          ON team.nhl_id = $1
         AND team.id IN (game.away_team_id, game.home_team_id)
        LEFT JOIN team_game_stats AS team_stats
          ON team_stats.game_id = game.id
         AND team_stats.team_id = team.id
        LEFT JOIN team_game_stats AS opponent_stats
          ON opponent_stats.game_id = game.id
         AND opponent_stats.team_id = CASE
           WHEN game.home_team_id = team.id THEN game.away_team_id
           ELSE game.home_team_id
         END
        WHERE game.season_id = $2
          AND game.game_type = 2
      ),
      completed_team_games AS (
        SELECT
          game.id,
          game.season_id,
          game.game_date,
          game.start_time_utc,
          stats.team_id,
          stats.score AS goals_for,
          opponent_stats.score AS goals_against,
          CASE
            WHEN stats.score > opponent_stats.score THEN 2
            WHEN stats.score < opponent_stats.score
              AND game.last_period_type IN ('OT', 'SO') THEN 1
            ELSE 0
          END AS points
        FROM games AS game
        JOIN team_game_stats AS stats
          ON stats.game_id = game.id
        JOIN team_game_stats AS opponent_stats
          ON opponent_stats.game_id = game.id
         AND opponent_stats.team_id <> stats.team_id
        WHERE game.game_type = 2
          AND (
            game.season_id = $2
            OR game.season_id = (SELECT id FROM previous_season)
          )
          AND game.state IN ('FINAL', 'OFF')
      )
      SELECT
        schedule.nhl_id::integer AS nhl_game_id,
        schedule.game_date::text AS game_date,
        schedule.start_time_utc::text AS start_time_utc,
        schedule.state,
        schedule.completed,
        schedule.is_home,
        opponent.nhl_id::integer AS opponent_nhl_team_id,
        COALESCE(opponent_season.abbreviation, opponent.abbreviation)
          AS opponent_abbreviation,
        COALESCE(opponent_season.full_name, opponent.name) AS opponent_name,
        schedule.team_score,
        schedule.opponent_score,
        COALESCE(prior_results.games_played, 0)::integer AS opponent_prior_games,
        prior_results.season_id AS opponent_results_season_id,
        prior_xg.season_id AS opponent_expected_goals_season_id,
        prior_results.points_percentage AS opponent_points_percentage,
        prior_results.goal_differential_per_game
          AS opponent_goal_differential_per_game,
        prior_xg.expected_goals_percentage
          AS opponent_expected_goals_percentage,
        CASE
          WHEN schedule.previous_game_date IS NULL THEN NULL
          ELSE GREATEST(schedule.game_date - schedule.previous_game_date - 1, 0)
        END::integer AS rest_days,
        CASE
          WHEN schedule.previous_game_date IS NULL THEN false
          ELSE schedule.game_date - schedule.previous_game_date <= 1
        END AS is_back_to_back
      FROM team_schedule AS schedule
      JOIN teams AS opponent
        ON opponent.id = schedule.opponent_team_id
      LEFT JOIN team_seasons AS opponent_season
        ON opponent_season.team_id = opponent.id
       AND opponent_season.season_id = $2
      LEFT JOIN LATERAL (
        SELECT
          result.season_id,
          COUNT(*)::integer AS games_played,
          SUM(result.points)::float / (2 * COUNT(*))
            AS points_percentage,
          SUM(result.goals_for - result.goals_against)::float / COUNT(*)
            AS goal_differential_per_game
        FROM completed_team_games AS result
        WHERE result.team_id = schedule.opponent_team_id
          AND (
            (
              result.season_id = $2
              AND (result.start_time_utc, result.id)
                < (schedule.start_time_utc, schedule.id)
            )
            OR result.season_id = (SELECT id FROM previous_season)
          )
        GROUP BY result.season_id
        ORDER BY (result.season_id = $2) DESC, result.season_id DESC
        LIMIT 1
      ) AS prior_results ON true
      LEFT JOIN LATERAL (
        SELECT
          advanced_game.season_id,
          CASE
            WHEN SUM(advanced.x_goals_for + advanced.x_goals_against) = 0
              THEN NULL
            ELSE SUM(advanced.x_goals_for)::float /
              SUM(advanced.x_goals_for + advanced.x_goals_against)
          END AS expected_goals_percentage
        FROM moneypuck_team_game_stats AS advanced
        JOIN games AS advanced_game
          ON advanced_game.id = advanced.game_id
        WHERE advanced.team_id = schedule.opponent_team_id
          AND advanced.situation = '5on5'
          AND advanced_game.game_type = 2
          AND advanced.x_goals_for IS NOT NULL
          AND advanced.x_goals_against IS NOT NULL
          AND (
            (
              advanced_game.season_id = $2
              AND (advanced_game.start_time_utc, advanced_game.id)
                < (schedule.start_time_utc, schedule.id)
            )
            OR advanced_game.season_id = (SELECT id FROM previous_season)
          )
        GROUP BY advanced_game.season_id
        ORDER BY (advanced_game.season_id = $2) DESC,
          advanced_game.season_id DESC
        LIMIT 1
      ) AS prior_xg ON true
      WHERE schedule.completed OR schedule.start_time_utc > NOW()
      ORDER BY schedule.start_time_utc, schedule.nhl_id
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
