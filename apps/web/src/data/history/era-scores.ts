import type {
  HistoricalEraScore,
  HistoricalGoalieEraScore,
  HistoryFilters
} from "@/contracts/history";
import { query } from "@/data/database";
import "server-only";
import { EraScoreRow, GoalieEraScoreRow, rankedHistoryParameters } from './rows';
export async function getHistoricalEraScores(
  gameType: number,
  filters: HistoryFilters,
  page = 1,
  pageSize = 25,
): Promise<HistoricalEraScore[]> {
  const safePage = Math.max(1, Math.trunc(page));
  const safePageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));
  const rows = await query<EraScoreRow>(
    `
      WITH totals AS (
        SELECT
          player.id AS player_id,
          player.nhl_id::integer AS nhl_player_id,
          player.display_name AS player_name,
          player.position,
          SUM(stats.games_played)::integer AS games_played,
          SUM(stats.points)::integer AS points,
          (
            100 * SUM(stats.points)::numeric /
            NULLIF(SUM(stats.games_played * league_rates.points_per_game), 0)
          )::float AS era_score
        FROM historical_skater_season_stats AS stats
        JOIN players AS player ON player.id = stats.player_id
        JOIN historical_era_rates AS league_rates
          ON league_rates.season_id = stats.season_id
         AND league_rates.game_type = stats.game_type
         AND league_rates.definition_version = 'historical-v1'
        WHERE stats.game_type = $1
          AND stats.season_id BETWEEN $2 AND $3
          AND ($5::text IS NULL OR player.position = $5)
          AND ($6::text IS NULL OR $6 = ANY(regexp_split_to_array(COALESCE(stats.team_abbrevs, ''), ',\\s*')))
          AND ($7::text IS NULL OR player.birth_country = $7)
        GROUP BY player.id
        HAVING SUM(stats.games_played) >= $4
      )
      SELECT
        (ROW_NUMBER() OVER (ORDER BY era_score DESC NULLS LAST, player_name))::integer AS rank,
        (COUNT(*) OVER ())::integer AS total_count,
        nhl_player_id,
        player_name,
        position,
        games_played,
        points,
        era_score
      FROM totals
      ORDER BY era_score DESC NULLS LAST, player_name
      LIMIT $8 OFFSET $9
    `,
    rankedHistoryParameters(
      gameType,
      filters,
      safePageSize,
      (safePage - 1) * safePageSize,
    ),
  );
  return rows.map((row) => ({
    rank: row.rank,
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    position: row.position,
    gamesPlayed: row.games_played,
    points: row.points,
    eraScore: row.era_score,
    totalRows: row.total_count,
  }));
}

export async function getHistoricalGoalieEraScores(
  gameType: number,
  filters: HistoryFilters,
  page = 1,
  pageSize = 25,
): Promise<HistoricalGoalieEraScore[]> {
  const safePage = Math.max(1, Math.trunc(page));
  const safePageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));
  const rows = await query<GoalieEraScoreRow>(
    `
      WITH totals AS (
        SELECT
          player.id AS player_id,
          player.nhl_id::integer AS nhl_player_id,
          player.display_name AS player_name,
          SUM(stats.games_played)::integer AS games_played,
          (SUM(stats.saves)::numeric / NULLIF(SUM(stats.shots_against), 0))::float AS save_percentage,
          (
            100 * SUM(stats.shots_against * (1 - league_rates.save_percentage)) /
            NULLIF(SUM(stats.shots_against - stats.saves), 0)
          )::float AS save_index
        FROM historical_goalie_season_stats AS stats
        JOIN players AS player ON player.id = stats.player_id
        JOIN historical_era_rates AS league_rates
          ON league_rates.season_id = stats.season_id
         AND league_rates.game_type = stats.game_type
         AND league_rates.definition_version = 'historical-v1'
        WHERE stats.game_type = $1
          AND stats.season_id BETWEEN $2 AND $3
          AND stats.saves IS NOT NULL
          AND stats.shots_against > 0
          AND ($5::text IS NULL OR $5::text IS NOT NULL)
          AND ($6::text IS NULL OR $6 = ANY(regexp_split_to_array(COALESCE(stats.team_abbrevs, ''), ',\\s*')))
          AND ($7::text IS NULL OR player.birth_country = $7)
        GROUP BY player.id
        HAVING SUM(stats.games_played) >= $4
      )
      SELECT
        (ROW_NUMBER() OVER (ORDER BY save_index DESC NULLS LAST, player_name))::integer AS rank,
        (COUNT(*) OVER ())::integer AS total_count,
        nhl_player_id,
        player_name,
        games_played,
        save_percentage,
        save_index
      FROM totals
      ORDER BY save_index DESC NULLS LAST, player_name
      LIMIT $8 OFFSET $9
    `,
    rankedHistoryParameters(
      gameType,
      filters,
      safePageSize,
      (safePage - 1) * safePageSize,
    ),
  );
  return rows.map((row) => ({
    rank: row.rank,
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    gamesPlayed: row.games_played,
    savePercentage: row.save_percentage,
    saveIndex: row.save_index,
    totalRows: row.total_count,
  }));
}
