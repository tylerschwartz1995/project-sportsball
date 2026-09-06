import type {
  HistoricalPeak,
  HistoryFilters,
  HistoryMetric
} from "@/contracts/history";
import { query } from "@/data/database";
import "server-only";
import { PeakRow, rankedHistoryParameters } from './rows';
export async function getHistoricalPeaks(
  view: "skaters" | "goalies",
  metric: HistoryMetric,
  window: 3 | 5,
  gameType: number,
  filters: HistoryFilters,
  page = 1,
  pageSize = 25,
): Promise<HistoricalPeak[]> {
  const safePage = Math.max(1, Math.trunc(page));
  const safePageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));
  const column = view === "goalies"
    ? metric === "shutouts" ? "shutouts" : "wins"
    : metric === "goals" || metric === "assists" ? metric : "points";
  const position = view === "goalies" ? "NULL::text" : "player.position";
  const rows = await query<PeakRow>(
    `
      WITH qualified AS (
        SELECT stats.*, stats.${column} AS metric_value
        FROM historical_peak_stats AS stats
        JOIN players AS player ON player.id = stats.player_id
        WHERE stats.game_type = $1
          AND stats.kind = $10 AND stats.window = $11
          AND stats.definition_version = 'historical-v1'
          AND stats.start_season_id >= $2 AND stats.end_season_id <= $3
          AND stats.games_played >= $4
          AND ($5::text IS NULL OR ${view === "goalies" ? "$5::text IS NOT NULL" : "player.position = $5"})
          AND ($6::text IS NULL OR $6 = ANY(stats.common_teams))
          AND ($7::text IS NULL OR player.birth_country = $7)
      )
      SELECT
        (ROW_NUMBER() OVER (ORDER BY metric_value DESC, player.display_name, end_season_id))::integer AS rank,
        (COUNT(*) OVER ())::integer AS total_count,
        player.nhl_id::integer AS nhl_player_id,
        player.display_name AS player_name,
        ${position} AS position,
        qualified.start_season_id,
        qualified.end_season_id,
        qualified.games_played,
        qualified.metric_value
      FROM qualified
      JOIN players AS player ON player.id = qualified.player_id
      ORDER BY metric_value DESC, player.display_name, end_season_id
      LIMIT $8 OFFSET $9
    `,
    [...rankedHistoryParameters(
      gameType,
      filters,
      safePageSize,
      (safePage - 1) * safePageSize,
    ), view, window],
  );
  return rows.map((row) => ({
    rank: row.rank,
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    position: row.position,
    startSeasonId: row.start_season_id,
    endSeasonId: row.end_season_id,
    gamesPlayed: row.games_played,
    value: row.metric_value,
    totalRows: row.total_count,
  }));
}
