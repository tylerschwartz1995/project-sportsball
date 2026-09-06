import type {
  HistoricalDecadeLeader,
  HistoricalGoalieDecadeLeader
} from "@/contracts/history";
import { query } from "@/data/database";
import "server-only";
export async function getHistoricalDecadeLeaders(
  gameType: number,
): Promise<HistoricalDecadeLeader[]> {
  const rows = await query<{
    decade: number;
    metric: HistoricalDecadeLeader["metric"];
    nhl_player_id: number;
    player_name: string;
    games_played: number;
    value: number;
  }>(`
    WITH player_decade_totals AS (
      SELECT
        ((stats.season_id / 10000) / 10 * 10)::integer AS decade,
        player.nhl_id::integer AS nhl_player_id,
        player.display_name AS player_name,
        SUM(stats.games_played)::integer AS games_played,
        SUM(stats.goals)::integer AS goals,
        SUM(stats.assists)::integer AS assists,
        SUM(stats.points)::integer AS points
      FROM historical_skater_season_stats AS stats
      JOIN players AS player ON player.id = stats.player_id
      WHERE stats.game_type = $1
      GROUP BY (stats.season_id / 10000) / 10, player.id
    ), metric_totals AS (
      SELECT
        totals.decade,
        totals.nhl_player_id,
        totals.player_name,
        totals.games_played,
        metrics.metric,
        metrics.value
      FROM player_decade_totals AS totals
      CROSS JOIN LATERAL (
        VALUES
          ('points'::text, totals.points),
          ('goals'::text, totals.goals),
          ('assists'::text, totals.assists)
      ) AS metrics(metric, value)
    ), ranked AS (
      SELECT
        metric_totals.*,
        ROW_NUMBER() OVER (
          PARTITION BY decade, metric
          ORDER BY value DESC, player_name, nhl_player_id
        ) AS decade_rank
      FROM metric_totals
    )
    SELECT decade, metric, nhl_player_id, player_name, games_played, value
    FROM ranked
    WHERE decade_rank = 1
    ORDER BY metric, decade
  `, [gameType]);
  return rows.map((row) => ({
    decade: row.decade,
    metric: row.metric,
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    gamesPlayed: row.games_played,
    value: row.value,
  }));
}

export async function getHistoricalGoalieDecadeLeaders(
  gameType: number,
  minimumGames: number,
): Promise<HistoricalGoalieDecadeLeader[]> {
  const rows = await query<{
    decade: number;
    metric: HistoricalGoalieDecadeLeader["metric"];
    nhl_player_id: number;
    player_name: string;
    games_played: number;
    value: number;
  }>(`
    WITH player_decade_totals AS (
      SELECT
        ((stats.season_id / 10000) / 10 * 10)::integer AS decade,
        player.nhl_id::integer AS nhl_player_id,
        player.display_name AS player_name,
        SUM(stats.games_played)::integer AS games_played,
        SUM(stats.games_played) FILTER (
          WHERE stats.saves IS NOT NULL AND stats.shots_against > 0
        )::integer AS save_percentage_games,
        SUM(stats.games_played) FILTER (
          WHERE stats.time_on_ice_seconds > 0
        )::integer AS goals_against_average_games,
        SUM(stats.wins)::numeric AS wins,
        (
          SUM(stats.saves) FILTER (WHERE stats.saves IS NOT NULL AND stats.shots_against > 0)::numeric /
          NULLIF(SUM(stats.shots_against) FILTER (WHERE stats.saves IS NOT NULL AND stats.shots_against > 0), 0)
        ) AS save_percentage,
        (
          3600 * SUM(stats.goals_against) FILTER (WHERE stats.time_on_ice_seconds > 0)::numeric /
          NULLIF(SUM(stats.time_on_ice_seconds) FILTER (WHERE stats.time_on_ice_seconds > 0), 0)
        ) AS goals_against_average
      FROM historical_goalie_season_stats AS stats
      JOIN players AS player ON player.id = stats.player_id
      WHERE stats.game_type = $1
      GROUP BY (stats.season_id / 10000) / 10, player.id
    ), metric_totals AS (
      SELECT
        totals.decade,
        totals.nhl_player_id,
        totals.player_name,
        metrics.metric,
        metrics.value,
        metrics.games_played
      FROM player_decade_totals AS totals
      CROSS JOIN LATERAL (
        VALUES
          ('wins'::text, totals.wins, totals.games_played),
          ('savePercentage'::text, totals.save_percentage, totals.save_percentage_games),
          ('goalsAgainstAverage'::text, totals.goals_against_average, totals.goals_against_average_games)
      ) AS metrics(metric, value, games_played)
      WHERE metrics.value IS NOT NULL
        AND metrics.games_played >= $2
    ), ranked AS (
      SELECT
        metric_totals.*,
        ROW_NUMBER() OVER (
          PARTITION BY decade, metric
          ORDER BY
            CASE WHEN metric = 'goalsAgainstAverage' THEN value END ASC NULLS LAST,
            CASE WHEN metric <> 'goalsAgainstAverage' THEN value END DESC NULLS LAST,
            player_name,
            nhl_player_id
        ) AS decade_rank
      FROM metric_totals
    )
    SELECT decade, metric, nhl_player_id, player_name, games_played, value::float
    FROM ranked
    WHERE decade_rank = 1
    ORDER BY metric, decade
  `, [gameType, minimumGames]);
  return rows.map((row) => ({
    decade: row.decade,
    metric: row.metric,
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    gamesPlayed: row.games_played,
    value: row.value,
  }));
}
