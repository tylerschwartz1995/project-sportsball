import type {
  HistoricalPlayerSeasons
} from "@/contracts/history";
import { query } from "@/data/database";
import "server-only";
import { GoalieSeasonRow, SkaterSeasonRow, mapGoalieSeason, mapSkaterSeason } from './rows';
export async function getHistoricalPlayerSeasons(
  nhlPlayerId: number,
): Promise<HistoricalPlayerSeasons> {
  const [skaterRows, goalieRows] = await Promise.all([
    query<SkaterSeasonRow>(`
      SELECT player.nhl_id::integer AS nhl_player_id,
        player.display_name AS player_name, player.position, stats.season_id, stats.game_type,
        stats.team_abbrevs, stats.games_played, stats.goals, stats.assists,
        stats.points,
        (stats.points::numeric / NULLIF(stats.games_played, 0))::float AS points_per_game
      FROM historical_skater_season_stats AS stats
      JOIN players AS player ON player.id = stats.player_id
      WHERE player.nhl_id = $1
      ORDER BY stats.season_id DESC, stats.game_type
    `, [nhlPlayerId]),
    query<GoalieSeasonRow>(`
      SELECT player.nhl_id::integer AS nhl_player_id,
        player.display_name AS player_name, stats.season_id, stats.game_type, stats.team_abbrevs,
        stats.games_played, stats.wins, stats.losses, stats.shutouts,
        stats.goals_against_average, stats.save_percentage
      FROM historical_goalie_season_stats AS stats
      JOIN players AS player ON player.id = stats.player_id
      WHERE player.nhl_id = $1
      ORDER BY stats.season_id DESC, stats.game_type
    `, [nhlPlayerId]),
  ]);
  return {
    skaters: skaterRows.map(mapSkaterSeason),
    goalies: goalieRows.map(mapGoalieSeason),
  };
}
