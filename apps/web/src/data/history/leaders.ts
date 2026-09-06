import type {
  GoalieHistoryMetric,
  HistoricalGoalieLeaders,
  HistoricalLeaderboard,
  HistoricalLeaders,
  HistoricalSkaterLeaders,
  HistoricalTeamLeaders,
  HistoryDisplay,
  HistoryFilters,
  HistoryMetric,
  HistoryOverview,
  HistoryRecordProgressionPoint,
  HistoryView,
  SkaterHistoryMetric,
  TeamHistoryMetric
} from "@/contracts/history";
import { query } from "@/data/database";
import "server-only";
import { DEFAULT_HISTORY_FILTERS, GOALIE_METRICS, GoalieCareerRow, GoalieSeasonRow, RankedRow, SKATER_METRICS, SkaterCareerRow, SkaterSeasonRow, TEAM_METRICS, TeamCareerRow, TeamSeasonRow, historyParameters, mapGoalieCareer, mapGoalieSeason, mapSkaterCareer, mapSkaterSeason, mapTeamCareer, mapTeamSeason, parseGoalieMetric, parseSkaterMetric, parseTeamMetric, rankedHistoryParameters } from './rows';
export async function getHistoricalLeaders(
  view: HistoryView,
  metric: HistoryMetric,
  gameType: number,
  filters: HistoryFilters = DEFAULT_HISTORY_FILTERS,
  limit = 100,
): Promise<HistoricalLeaders> {
  if (view === "goalies") {
    return getGoalieLeaders(parseGoalieMetric(metric), gameType, filters, limit);
  }
  if (view === "teams") {
    return getTeamLeaders(parseTeamMetric(metric), gameType, filters, limit);
  }
  return getSkaterLeaders(parseSkaterMetric(metric), gameType, filters, limit);
}

export async function getHistoricalLeaderboard(
  view: HistoryView,
  display: HistoryDisplay,
  metric: HistoryMetric,
  gameType: number,
  filters: HistoryFilters,
  page = 1,
  pageSize = 25,
): Promise<HistoricalLeaderboard> {
  const safePage = Math.max(1, Math.trunc(page));
  const safePageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));
  const offset = (safePage - 1) * safePageSize;

  if (view === "goalies") {
    const goalieMetric = parseGoalieMetric(metric);
    const rows = display === "career"
      ? await getRankedGoalieCareers(
        goalieMetric,
        gameType,
        filters,
        safePageSize,
        offset,
      )
      : await getRankedGoalieSeasons(
        goalieMetric,
        gameType,
        filters,
        safePageSize,
        offset,
      );
    return {
      view,
      display,
      metric: goalieMetric,
      rows,
      totalRows: rows[0]?.totalRows ?? 0,
    };
  }

  if (view === "teams") {
    const teamMetric = parseTeamMetric(metric);
    const rows = display === "career"
      ? await getRankedTeamCareers(
        teamMetric,
        gameType,
        filters,
        safePageSize,
        offset,
      )
      : await getRankedTeamSeasons(
        teamMetric,
        gameType,
        filters,
        safePageSize,
        offset,
      );
    return {
      view,
      display,
      metric: teamMetric,
      rows,
      totalRows: rows[0]?.totalRows ?? 0,
    };
  }

  const skaterMetric = parseSkaterMetric(metric);
  const rows = display === "career"
    ? await getRankedSkaterCareers(
      skaterMetric,
      gameType,
      filters,
      safePageSize,
      offset,
    )
    : await getRankedSkaterSeasons(
      skaterMetric,
      gameType,
      filters,
      safePageSize,
      offset,
    );
  return {
    view,
    display,
    metric: skaterMetric,
    rows,
    totalRows: rows[0]?.totalRows ?? 0,
  };
}

export async function getRankedSkaterCareers(
  metric: SkaterHistoryMetric,
  gameType: number,
  filters: HistoryFilters,
  limit: number,
  offset: number,
) {
  const orderColumn = SKATER_METRICS[metric];
  const rows = await query<SkaterCareerRow & RankedRow>(
    `
      WITH totals AS (
        SELECT
          player.nhl_id::integer AS nhl_player_id,
          player.display_name AS player_name,
          player.position,
          COUNT(DISTINCT stats.season_id)::integer AS seasons_played,
          SUM(stats.games_played)::integer AS games_played,
          SUM(stats.goals)::integer AS goals,
          SUM(stats.assists)::integer AS assists,
          SUM(stats.points)::integer AS points,
          (SUM(stats.points)::numeric / NULLIF(SUM(stats.games_played), 0))::float AS points_per_game
        FROM historical_skater_season_stats AS stats
        JOIN players AS player ON player.id = stats.player_id
        WHERE stats.game_type = $1
          AND stats.season_id BETWEEN $2 AND $3
          AND ($5::text IS NULL OR player.position = $5)
          AND ($6::text IS NULL OR $6 = ANY(regexp_split_to_array(COALESCE(stats.team_abbrevs, ''), ',\\s*')))
          AND ($7::text IS NULL OR player.birth_country = $7)
        GROUP BY player.id
        HAVING SUM(stats.games_played) >= $4
      )
      SELECT
        (ROW_NUMBER() OVER (ORDER BY ${orderColumn} DESC NULLS LAST, player_name))::integer AS rank,
        (COUNT(*) OVER ())::integer AS total_count,
        totals.*
      FROM totals
      ORDER BY ${orderColumn} DESC NULLS LAST, player_name
      LIMIT $8 OFFSET $9
    `,
    rankedHistoryParameters(gameType, filters, limit, offset),
  );
  return rows.map((row) => ({
    ...mapSkaterCareer(row),
    rank: row.rank,
    totalRows: row.total_count,
  }));
}

export async function getRankedSkaterSeasons(
  metric: SkaterHistoryMetric,
  gameType: number,
  filters: HistoryFilters,
  limit: number,
  offset: number,
) {
  const orderColumn = SKATER_METRICS[metric];
  const rows = await query<SkaterSeasonRow & RankedRow>(
    `
      WITH seasons AS (
        SELECT
          player.nhl_id::integer AS nhl_player_id,
          player.display_name AS player_name,
          player.position,
          stats.season_id,
          stats.game_type,
          stats.team_abbrevs,
          stats.games_played,
          stats.goals,
          stats.assists,
          stats.points,
          (stats.points::numeric / NULLIF(stats.games_played, 0))::float AS points_per_game
        FROM historical_skater_season_stats AS stats
        JOIN players AS player ON player.id = stats.player_id
        WHERE stats.game_type = $1
          AND stats.season_id BETWEEN $2 AND $3
          AND stats.games_played >= $4
          AND ($5::text IS NULL OR player.position = $5)
          AND ($6::text IS NULL OR $6 = ANY(regexp_split_to_array(COALESCE(stats.team_abbrevs, ''), ',\\s*')))
          AND ($7::text IS NULL OR player.birth_country = $7)
      )
      SELECT
        (ROW_NUMBER() OVER (ORDER BY ${orderColumn} DESC NULLS LAST, player_name))::integer AS rank,
        (COUNT(*) OVER ())::integer AS total_count,
        seasons.*
      FROM seasons
      ORDER BY ${orderColumn} DESC NULLS LAST, player_name
      LIMIT $8 OFFSET $9
    `,
    rankedHistoryParameters(gameType, filters, limit, offset),
  );
  return rows.map((row) => ({
    ...mapSkaterSeason(row),
    rank: row.rank,
    totalRows: row.total_count,
  }));
}

export async function getRankedGoalieCareers(
  metric: GoalieHistoryMetric,
  gameType: number,
  filters: HistoryFilters,
  limit: number,
  offset: number,
) {
  const orderColumn = GOALIE_METRICS[metric];
  const rows = await query<GoalieCareerRow & RankedRow>(
    `
      WITH totals AS (
        SELECT
          player.nhl_id::integer AS nhl_player_id,
          player.display_name AS player_name,
          COUNT(DISTINCT stats.season_id)::integer AS seasons_played,
          SUM(stats.games_played)::integer AS games_played,
          SUM(stats.wins)::integer AS wins,
          SUM(stats.losses)::integer AS losses,
          SUM(stats.shutouts)::integer AS shutouts,
          (SUM(stats.saves)::numeric / NULLIF(SUM(stats.shots_against), 0))::float AS save_percentage
        FROM historical_goalie_season_stats AS stats
        JOIN players AS player ON player.id = stats.player_id
        WHERE stats.game_type = $1
          AND stats.season_id BETWEEN $2 AND $3
          AND ($5::text IS NULL OR $5::text IS NOT NULL)
          AND ($6::text IS NULL OR $6 = ANY(regexp_split_to_array(COALESCE(stats.team_abbrevs, ''), ',\\s*')))
          AND ($7::text IS NULL OR player.birth_country = $7)
        GROUP BY player.id
        HAVING SUM(stats.games_played) >= $4
      )
      SELECT
        (ROW_NUMBER() OVER (ORDER BY ${orderColumn} DESC NULLS LAST, player_name))::integer AS rank,
        (COUNT(*) OVER ())::integer AS total_count,
        totals.*
      FROM totals
      ORDER BY ${orderColumn} DESC NULLS LAST, player_name
      LIMIT $8 OFFSET $9
    `,
    rankedHistoryParameters(gameType, filters, limit, offset),
  );
  return rows.map((row) => ({
    ...mapGoalieCareer(row),
    rank: row.rank,
    totalRows: row.total_count,
  }));
}

export async function getRankedGoalieSeasons(
  metric: GoalieHistoryMetric,
  gameType: number,
  filters: HistoryFilters,
  limit: number,
  offset: number,
) {
  const orderColumn = GOALIE_METRICS[metric];
  const rows = await query<GoalieSeasonRow & RankedRow>(
    `
      WITH seasons AS (
        SELECT
          player.nhl_id::integer AS nhl_player_id,
          player.display_name AS player_name,
          stats.season_id,
          stats.game_type,
          stats.team_abbrevs,
          stats.games_played,
          stats.wins,
          stats.losses,
          stats.shutouts,
          stats.goals_against_average,
          stats.save_percentage
        FROM historical_goalie_season_stats AS stats
        JOIN players AS player ON player.id = stats.player_id
        WHERE stats.game_type = $1
          AND stats.season_id BETWEEN $2 AND $3
          AND stats.games_played >= $4
          AND ($5::text IS NULL OR $5::text IS NOT NULL)
          AND ($6::text IS NULL OR $6 = ANY(regexp_split_to_array(COALESCE(stats.team_abbrevs, ''), ',\\s*')))
          AND ($7::text IS NULL OR player.birth_country = $7)
      )
      SELECT
        (ROW_NUMBER() OVER (ORDER BY ${orderColumn} DESC NULLS LAST, player_name))::integer AS rank,
        (COUNT(*) OVER ())::integer AS total_count,
        seasons.*
      FROM seasons
      ORDER BY ${orderColumn} DESC NULLS LAST, player_name
      LIMIT $8 OFFSET $9
    `,
    rankedHistoryParameters(gameType, filters, limit, offset),
  );
  return rows.map((row) => ({
    ...mapGoalieSeason(row),
    rank: row.rank,
    totalRows: row.total_count,
  }));
}

export async function getRankedTeamCareers(
  metric: TeamHistoryMetric,
  gameType: number,
  filters: HistoryFilters,
  limit: number,
  offset: number,
) {
  const orderColumn = TEAM_METRICS[metric];
  const rows = await query<TeamCareerRow & RankedRow>(
    `
      WITH totals AS (
        SELECT
          stats.nhl_team_id,
          (ARRAY_AGG(stats.team_name ORDER BY stats.season_id DESC))[1] AS team_name,
          COUNT(DISTINCT stats.season_id)::integer AS seasons_played,
          SUM(stats.games_played)::integer AS games_played,
          SUM(stats.wins)::integer AS wins,
          SUM(stats.losses)::integer AS losses,
          SUM(COALESCE(stats.ties, 0))::integer AS ties,
          SUM(COALESCE(stats.overtime_losses, 0))::integer AS overtime_losses,
          SUM(stats.points)::integer AS points,
          (SUM(stats.points)::numeric / NULLIF(2 * SUM(stats.games_played), 0))::float AS point_percentage
        FROM historical_team_season_stats AS stats
        WHERE stats.game_type = $1
          AND stats.season_id BETWEEN $2 AND $3
          AND ($5::text IS NULL OR $5::text IS NOT NULL)
          AND ($6::text IS NULL OR $6::text IS NOT NULL)
          AND ($7::text IS NULL OR $7::text IS NOT NULL)
        GROUP BY stats.nhl_team_id
        HAVING SUM(stats.games_played) >= $4
      )
      SELECT
        (ROW_NUMBER() OVER (ORDER BY ${orderColumn} DESC NULLS LAST, team_name))::integer AS rank,
        (COUNT(*) OVER ())::integer AS total_count,
        totals.*
      FROM totals
      ORDER BY ${orderColumn} DESC NULLS LAST, team_name
      LIMIT $8 OFFSET $9
    `,
    rankedHistoryParameters(gameType, filters, limit, offset),
  );
  return rows.map((row) => ({
    ...mapTeamCareer(row),
    rank: row.rank,
    totalRows: row.total_count,
  }));
}

export async function getRankedTeamSeasons(
  metric: TeamHistoryMetric,
  gameType: number,
  filters: HistoryFilters,
  limit: number,
  offset: number,
) {
  const orderColumn = TEAM_METRICS[metric];
  const rows = await query<TeamSeasonRow & RankedRow>(
    `
      WITH seasons AS (
        SELECT
          stats.nhl_team_id,
          stats.team_name,
          stats.season_id,
          stats.game_type,
          stats.games_played,
          stats.wins,
          stats.losses,
          COALESCE(stats.ties, 0)::integer AS ties,
          COALESCE(stats.overtime_losses, 0)::integer AS overtime_losses,
          stats.points,
          stats.point_percentage,
          stats.goals_for,
          stats.goals_against
        FROM historical_team_season_stats AS stats
        WHERE stats.game_type = $1
          AND stats.season_id BETWEEN $2 AND $3
          AND stats.games_played >= $4
          AND ($5::text IS NULL OR $5::text IS NOT NULL)
          AND ($6::text IS NULL OR $6::text IS NOT NULL)
          AND ($7::text IS NULL OR $7::text IS NOT NULL)
      )
      SELECT
        (ROW_NUMBER() OVER (ORDER BY ${orderColumn} DESC NULLS LAST, team_name))::integer AS rank,
        (COUNT(*) OVER ())::integer AS total_count,
        seasons.*
      FROM seasons
      ORDER BY ${orderColumn} DESC NULLS LAST, team_name
      LIMIT $8 OFFSET $9
    `,
    rankedHistoryParameters(gameType, filters, limit, offset),
  );
  return rows.map((row) => ({
    ...mapTeamSeason(row),
    rank: row.rank,
    totalRows: row.total_count,
  }));
}

export async function getHistoryRecordProgression(
  gameType: number,
): Promise<HistoryOverview["recordProgression"]> {
  const rows = await query<{
    season_id: number;
    nhl_player_id: number;
    player_name: string;
    metric: HistoryRecordProgressionPoint["metric"];
    record_value: number;
  }>(`
    WITH running AS (
      SELECT
        stats.season_id,
        stats.player_id,
        metric.name AS metric,
        SUM(metric.value) OVER (
          PARTITION BY stats.player_id, metric.name
          ORDER BY stats.season_id
        )::integer AS record_value
      FROM historical_skater_season_stats AS stats
      CROSS JOIN LATERAL (
        VALUES
          ('points'::text, stats.points),
          ('goals'::text, stats.goals),
          ('assists'::text, stats.assists)
      ) AS metric(name, value)
      WHERE stats.game_type = $1
    ), season_leaders AS (
      SELECT DISTINCT ON (metric, season_id)
        season_id, player_id, metric, record_value
      FROM running
      ORDER BY metric, season_id, record_value DESC, player_id
    ), changes AS (
      SELECT *, MAX(record_value) OVER (
        PARTITION BY metric
        ORDER BY season_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ) AS previous_value
      FROM season_leaders
    )
    SELECT
      changes.season_id,
      player.nhl_id::integer AS nhl_player_id,
      player.display_name AS player_name,
      changes.metric,
      changes.record_value
    FROM changes
    JOIN players AS player ON player.id = changes.player_id
    WHERE changes.record_value > COALESCE(changes.previous_value, -1)
    ORDER BY changes.metric, changes.season_id
  `, [gameType]);
  return rows.map((row) => ({
    seasonId: row.season_id,
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    metric: row.metric,
    value: row.record_value,
  }));
}

export async function getSkaterLeaders(
  metric: SkaterHistoryMetric,
  gameType: number,
  filters: HistoryFilters,
  limit: number,
): Promise<HistoricalSkaterLeaders> {
  const careerOrder = metric === "pointsPerGame"
    ? "SUM(stats.points)::numeric / NULLIF(SUM(stats.games_played), 0)"
    : `SUM(stats.${SKATER_METRICS[metric]})`;
  const seasonOrder = metric === "pointsPerGame"
    ? "stats.points::numeric / NULLIF(stats.games_played, 0)"
    : `stats.${SKATER_METRICS[metric]}`;
  const parameters = historyParameters(gameType, filters, limit);
  const [careerRows, seasonRows] = await Promise.all([
    query<SkaterCareerRow>(
      `
        SELECT
          player.nhl_id::integer AS nhl_player_id,
          player.display_name AS player_name,
          player.position,
          COUNT(DISTINCT stats.season_id)::integer AS seasons_played,
          SUM(stats.games_played)::integer AS games_played,
          SUM(stats.goals)::integer AS goals,
          SUM(stats.assists)::integer AS assists,
          SUM(stats.points)::integer AS points,
          (SUM(stats.points)::numeric / NULLIF(SUM(stats.games_played), 0))::float AS points_per_game
        FROM historical_skater_season_stats AS stats
        JOIN players AS player ON player.id = stats.player_id
        WHERE stats.game_type = $1
          AND stats.season_id BETWEEN $2 AND $3
          AND ($5::text IS NULL OR player.position = $5)
          AND ($6::text IS NULL OR $6 = ANY(regexp_split_to_array(COALESCE(stats.team_abbrevs, ''), ',\\s*')))
          AND ($7::text IS NULL OR player.birth_country = $7)
        GROUP BY player.id
        HAVING SUM(stats.games_played) >= $4
        ORDER BY ${careerOrder} DESC NULLS LAST, player.display_name
        LIMIT $8
      `,
      parameters,
    ),
    query<SkaterSeasonRow>(
      `
        SELECT
          player.nhl_id::integer AS nhl_player_id,
          player.display_name AS player_name,
          player.position,
          stats.season_id,
          stats.game_type,
          stats.team_abbrevs,
          stats.games_played,
          stats.goals,
          stats.assists,
          stats.points,
          (stats.points::numeric / NULLIF(stats.games_played, 0))::float AS points_per_game
        FROM historical_skater_season_stats AS stats
        JOIN players AS player ON player.id = stats.player_id
        WHERE stats.game_type = $1
          AND stats.season_id BETWEEN $2 AND $3
          AND stats.games_played >= $4
          AND ($5::text IS NULL OR player.position = $5)
          AND ($6::text IS NULL OR $6 = ANY(regexp_split_to_array(COALESCE(stats.team_abbrevs, ''), ',\\s*')))
          AND ($7::text IS NULL OR player.birth_country = $7)
        ORDER BY ${seasonOrder} DESC NULLS LAST, player.display_name
        LIMIT $8
      `,
      parameters,
    ),
  ]);
  return {
    view: "skaters",
    metric,
    careers: careerRows.map(mapSkaterCareer),
    seasons: seasonRows.map(mapSkaterSeason),
  };
}

export async function getGoalieLeaders(
  metric: GoalieHistoryMetric,
  gameType: number,
  filters: HistoryFilters,
  limit: number,
): Promise<HistoricalGoalieLeaders> {
  const careerOrder = metric === "savePercentage"
    ? "SUM(stats.saves)::numeric / NULLIF(SUM(stats.shots_against), 0)"
    : `SUM(stats.${GOALIE_METRICS[metric]})`;
  const seasonOrder = metric === "savePercentage"
    ? "stats.save_percentage"
    : `stats.${GOALIE_METRICS[metric]}`;
  const parameters = historyParameters(gameType, filters, limit);
  const [careerRows, seasonRows] = await Promise.all([
    query<GoalieCareerRow>(
      `
        SELECT
          player.nhl_id::integer AS nhl_player_id,
          player.display_name AS player_name,
          COUNT(DISTINCT stats.season_id)::integer AS seasons_played,
          SUM(stats.games_played)::integer AS games_played,
          SUM(stats.wins)::integer AS wins,
          SUM(stats.losses)::integer AS losses,
          SUM(stats.shutouts)::integer AS shutouts,
          (SUM(stats.saves)::numeric / NULLIF(SUM(stats.shots_against), 0))::float AS save_percentage
        FROM historical_goalie_season_stats AS stats
        JOIN players AS player ON player.id = stats.player_id
        WHERE stats.game_type = $1
          AND stats.season_id BETWEEN $2 AND $3
          AND ($5::text IS NULL OR $5::text IS NOT NULL)
          AND ($6::text IS NULL OR $6 = ANY(regexp_split_to_array(COALESCE(stats.team_abbrevs, ''), ',\\s*')))
          AND ($7::text IS NULL OR player.birth_country = $7)
        GROUP BY player.id
        HAVING SUM(stats.games_played) >= $4
        ORDER BY ${careerOrder} DESC NULLS LAST, player.display_name
        LIMIT $8
      `,
      parameters,
    ),
    query<GoalieSeasonRow>(
      `
        SELECT
          player.nhl_id::integer AS nhl_player_id,
          player.display_name AS player_name,
          stats.season_id,
          stats.game_type,
          stats.team_abbrevs,
          stats.games_played,
          stats.wins,
          stats.losses,
          stats.shutouts,
          stats.goals_against_average,
          stats.save_percentage
        FROM historical_goalie_season_stats AS stats
        JOIN players AS player ON player.id = stats.player_id
        WHERE stats.game_type = $1
          AND stats.season_id BETWEEN $2 AND $3
          AND stats.games_played >= $4
          AND ($5::text IS NULL OR $5::text IS NOT NULL)
          AND ($6::text IS NULL OR $6 = ANY(regexp_split_to_array(COALESCE(stats.team_abbrevs, ''), ',\\s*')))
          AND ($7::text IS NULL OR player.birth_country = $7)
        ORDER BY ${seasonOrder} DESC NULLS LAST, player.display_name
        LIMIT $8
      `,
      parameters,
    ),
  ]);
  return {
    view: "goalies",
    metric,
    careers: careerRows.map(mapGoalieCareer),
    seasons: seasonRows.map(mapGoalieSeason),
  };
}

export async function getTeamLeaders(
  metric: TeamHistoryMetric,
  gameType: number,
  filters: HistoryFilters,
  limit: number,
): Promise<HistoricalTeamLeaders> {
  const column = TEAM_METRICS[metric];
  const careerOrder = metric === "pointPercentage"
    ? "SUM(stats.points)::numeric / NULLIF(2 * SUM(stats.games_played), 0)"
    : `SUM(stats.${column})`;
  const [careerRows, seasonRows] = await Promise.all([
    query<TeamCareerRow>(
      `
        SELECT
          stats.nhl_team_id,
          (ARRAY_AGG(stats.team_name ORDER BY stats.season_id DESC))[1] AS team_name,
          COUNT(DISTINCT stats.season_id)::integer AS seasons_played,
          SUM(stats.games_played)::integer AS games_played,
          SUM(stats.wins)::integer AS wins,
          SUM(stats.losses)::integer AS losses,
          SUM(COALESCE(stats.ties, 0))::integer AS ties,
          SUM(COALESCE(stats.overtime_losses, 0))::integer AS overtime_losses,
          SUM(stats.points)::integer AS points,
          (SUM(stats.points)::numeric / NULLIF(2 * SUM(stats.games_played), 0))::float AS point_percentage
        FROM historical_team_season_stats AS stats
        WHERE stats.game_type = $1
          AND stats.season_id BETWEEN $2 AND $3
          AND ($5::text IS NULL OR $5::text IS NOT NULL)
          AND ($6::text IS NULL OR $6::text IS NOT NULL)
          AND ($7::text IS NULL OR $7::text IS NOT NULL)
        GROUP BY stats.nhl_team_id
        HAVING SUM(stats.games_played) >= $4
        ORDER BY ${careerOrder} DESC, team_name
        LIMIT $8
      `,
      historyParameters(gameType, filters, limit),
    ),
    query<TeamSeasonRow>(
      `
        SELECT
          stats.nhl_team_id,
          stats.team_name,
          stats.season_id,
          stats.game_type,
          stats.games_played,
          stats.wins,
          stats.losses,
          COALESCE(stats.ties, 0)::integer AS ties,
          COALESCE(stats.overtime_losses, 0)::integer AS overtime_losses,
          stats.points,
          stats.point_percentage,
          stats.goals_for,
          stats.goals_against
        FROM historical_team_season_stats AS stats
        WHERE stats.game_type = $1
          AND stats.season_id BETWEEN $2 AND $3
          AND stats.games_played >= $4
          AND ($5::text IS NULL OR $5::text IS NOT NULL)
          AND ($6::text IS NULL OR $6::text IS NOT NULL)
          AND ($7::text IS NULL OR $7::text IS NOT NULL)
        ORDER BY stats.${column} DESC NULLS LAST, stats.team_name
        LIMIT $8
      `,
      historyParameters(gameType, filters, limit),
    ),
  ]);
  return {
    view: "teams",
    metric,
    careers: careerRows.map(mapTeamCareer),
    seasons: seasonRows.map(mapTeamSeason),
  };
}
