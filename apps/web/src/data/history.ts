import "server-only";

import type {
  GoalieHistoryMetric,
  HistoricalGoalieCareer,
  HistoricalGoalieLeaders,
  HistoricalGoalieSeason,
  HistoricalLeaderboard,
  HistoricalPeak,
  HistoricalEraScore,
  HistoricalDecadeLeader,
  HistoryOverview,
  HistoricalPlayerSeasons,
  HistoricalLeaders,
  HistoricalSkaterCareer,
  HistoricalSkaterLeaders,
  HistoricalSkaterSeason,
  HistoricalTeamCareer,
  HistoricalTeamLeaders,
  HistoricalTeamSeason,
  HistoryMetric,
  HistoryRecordProgressionPoint,
  HistoryFilterOptions,
  HistoryDisplay,
  HistoryFilters,
  HistoryView,
  SkaterHistoryMetric,
  TeamHistoryMetric,
} from "@/contracts/history";
import { query } from "@/data/database";

type SkaterCareerRow = {
  nhl_player_id: number;
  player_name: string;
  position: string | null;
  seasons_played: number;
  games_played: number;
  goals: number;
  assists: number;
  points: number;
  points_per_game: number;
};

type SkaterSeasonRow = Omit<SkaterCareerRow, "seasons_played"> & {
  season_id: number;
  game_type: number;
  team_abbrevs: string | null;
};

type GoalieCareerRow = {
  nhl_player_id: number;
  player_name: string;
  seasons_played: number;
  games_played: number;
  wins: number;
  losses: number;
  shutouts: number;
  save_percentage: number | null;
};

type GoalieSeasonRow = Omit<GoalieCareerRow, "seasons_played"> & {
  season_id: number;
  game_type: number;
  team_abbrevs: string | null;
  goals_against_average: number | null;
  save_percentage: number | null;
};

type TeamCareerRow = {
  nhl_team_id: number;
  team_name: string;
  seasons_played: number;
  games_played: number;
  wins: number;
  losses: number;
  ties: number;
  overtime_losses: number;
  points: number;
  point_percentage: number | null;
};

type TeamSeasonRow = Omit<TeamCareerRow, "seasons_played"> & {
  season_id: number;
  game_type: number;
  point_percentage: number | null;
  goals_for: number;
  goals_against: number;
};

type RankedRow = {
  rank: number;
  total_count: number;
};

type PeakRow = RankedRow & {
  nhl_player_id: number;
  player_name: string;
  position: string | null;
  start_season_id: number;
  end_season_id: number;
  games_played: number;
  metric_value: number;
};

type EraScoreRow = RankedRow & {
  nhl_player_id: number;
  player_name: string;
  position: string | null;
  games_played: number;
  points: number;
  era_score: number;
};

const SKATER_METRICS: Record<SkaterHistoryMetric, string> = {
  points: "points",
  goals: "goals",
  assists: "assists",
  games: "games_played",
  pointsPerGame: "points_per_game",
};
const GOALIE_METRICS: Record<GoalieHistoryMetric, string> = {
  wins: "wins",
  games: "games_played",
  shutouts: "shutouts",
  savePercentage: "save_percentage",
};
const TEAM_METRICS: Record<TeamHistoryMetric, string> = {
  points: "points",
  wins: "wins",
  pointPercentage: "point_percentage",
};

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

export function historyDefaultMinimumGames(
  view: HistoryView,
  metric: HistoryMetric,
  display: HistoryDisplay,
  gameType: number,
): number {
  const playoffs = gameType === 3;
  if (view === "skaters" && metric === "pointsPerGame") {
    return display === "career" ? (playoffs ? 100 : 500) : (playoffs ? 10 : 40);
  }
  if (view === "goalies" && metric === "savePercentage") {
    return display === "career" ? (playoffs ? 25 : 250) : (playoffs ? 3 : 25);
  }
  if (view === "teams" && metric === "pointPercentage") {
    return display === "career" ? (playoffs ? 50 : 500) : (playoffs ? 4 : 40);
  }
  return 0;
}

export async function getHistoryOverview(
  gameType: number,
): Promise<HistoryOverview> {
  const filters = { ...DEFAULT_HISTORY_FILTERS };
  const teamFilters = {
    ...filters,
    minimumGames: historyDefaultMinimumGames(
      "teams",
      "pointPercentage",
      "seasons",
      gameType,
    ),
  };
  const [points, goals, goalies, teams, recordProgression, leagueTrend] =
    await Promise.all([
      getHistoricalLeaderboard(
        "skaters",
        "career",
        "points",
        gameType,
        filters,
        1,
        3,
      ),
      getHistoricalLeaderboard(
        "skaters",
        "career",
        "goals",
        gameType,
        filters,
        1,
        3,
      ),
      getHistoricalLeaderboard(
        "goalies",
        "career",
        "wins",
        gameType,
        filters,
        1,
        3,
      ),
      getHistoricalLeaderboard(
        "teams",
        "seasons",
        "pointPercentage",
        gameType,
        teamFilters,
        1,
        3,
      ),
      getHistoryRecordProgression(gameType),
      getHistoryLeagueTrend(gameType),
    ]);

  return {
    careerPoints: points.view === "skaters"
      ? points.rows as HistoricalSkaterCareer[]
      : [],
    careerGoals: goals.view === "skaters"
      ? goals.rows as HistoricalSkaterCareer[]
      : [],
    goalieWins: goalies.view === "goalies"
      ? goalies.rows as HistoricalGoalieCareer[]
      : [],
    teamSeasons: teams.view === "teams"
      ? teams.rows as HistoricalTeamSeason[]
      : [],
    recordProgression,
    leagueTrend,
  };
}

async function getRankedSkaterCareers(
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

async function getRankedSkaterSeasons(
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

async function getRankedGoalieCareers(
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

async function getRankedGoalieSeasons(
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

async function getRankedTeamCareers(
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

async function getRankedTeamSeasons(
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

async function getHistoryRecordProgression(
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

export async function getHistoryLeagueTrend(
  gameType: number,
): Promise<HistoryOverview["leagueTrend"]> {
  const rows = await query<{
    season_id: number;
    goals_per_team_game: number;
    points_per_team_game: number;
    wins_per_team_game: number;
  }>(`
    SELECT
      season_id,
      (SUM(goals_for)::numeric / NULLIF(SUM(games_played), 0))::float AS goals_per_team_game,
      (SUM(points)::numeric / NULLIF(SUM(games_played), 0))::float AS points_per_team_game,
      (SUM(wins)::numeric / NULLIF(SUM(games_played), 0))::float AS wins_per_team_game
    FROM historical_team_season_stats
    WHERE game_type = $1
    GROUP BY season_id
    ORDER BY season_id
  `, [gameType]);
  return rows.map((row) => ({
    seasonId: row.season_id,
    goalsPerTeamGame: row.goals_per_team_game,
    pointsPerTeamGame: row.points_per_team_game,
    winsPerTeamGame: row.wins_per_team_game,
  }));
}

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
  const table = view === "goalies"
    ? "historical_goalie_season_stats"
    : "historical_skater_season_stats";
  const position = view === "goalies" ? "NULL::text" : "player.position";
  const frame = window - 1;
  const rows = await query<PeakRow>(
    `
      WITH source AS (
        SELECT
          stats.player_id,
          stats.season_id,
          stats.games_played,
          stats.${column} AS metric_value
        FROM ${table} AS stats
        JOIN players AS player ON player.id = stats.player_id
        WHERE stats.game_type = $1
          AND stats.season_id BETWEEN $2 AND $3
          AND ($5::text IS NULL OR ${view === "goalies" ? "$5::text IS NOT NULL" : "player.position = $5"})
          AND ($6::text IS NULL OR $6 = ANY(regexp_split_to_array(COALESCE(stats.team_abbrevs, ''), ',\\s*')))
          AND ($7::text IS NULL OR player.birth_country = $7)
      ), rolling AS (
        SELECT
          player_id,
          season_id AS end_season_id,
          LAG(season_id, ${frame}) OVER (
            PARTITION BY player_id ORDER BY season_id
          ) AS start_season_id,
          COUNT(*) OVER (
            PARTITION BY player_id ORDER BY season_id
            ROWS BETWEEN ${frame} PRECEDING AND CURRENT ROW
          ) AS season_count,
          SUM(games_played) OVER (
            PARTITION BY player_id ORDER BY season_id
            ROWS BETWEEN ${frame} PRECEDING AND CURRENT ROW
          )::integer AS games_played,
          SUM(metric_value) OVER (
            PARTITION BY player_id ORDER BY season_id
            ROWS BETWEEN ${frame} PRECEDING AND CURRENT ROW
          )::integer AS metric_value
        FROM source
      ), qualified AS (
        SELECT *
        FROM rolling
        WHERE season_count = ${window}
          AND end_season_id / 10000 - start_season_id / 10000 = ${frame}
          AND games_played >= $4
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
    startSeasonId: row.start_season_id,
    endSeasonId: row.end_season_id,
    gamesPlayed: row.games_played,
    value: row.metric_value,
    totalRows: row.total_count,
  }));
}

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
      WITH league_rates AS (
        SELECT
          season_id,
          SUM(points)::numeric / NULLIF(SUM(games_played), 0) AS points_per_game
        FROM historical_skater_season_stats
        WHERE game_type = $1
          AND season_id BETWEEN $2 AND $3
        GROUP BY season_id
      ), totals AS (
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
        JOIN league_rates ON league_rates.season_id = stats.season_id
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

export async function getHistoricalDecadeLeaders(
  gameType: number,
): Promise<HistoricalDecadeLeader[]> {
  const rows = await query<{
    decade: number;
    nhl_player_id: number;
    player_name: string;
    games_played: number;
    points: number;
  }>(`
    WITH totals AS (
      SELECT
        ((stats.season_id / 10000) / 10 * 10)::integer AS decade,
        player.nhl_id::integer AS nhl_player_id,
        player.display_name AS player_name,
        SUM(stats.games_played)::integer AS games_played,
        SUM(stats.points)::integer AS points,
        ROW_NUMBER() OVER (
          PARTITION BY (stats.season_id / 10000) / 10
          ORDER BY SUM(stats.points) DESC, player.display_name
        ) AS decade_rank
      FROM historical_skater_season_stats AS stats
      JOIN players AS player ON player.id = stats.player_id
      WHERE stats.game_type = $1
      GROUP BY (stats.season_id / 10000) / 10, player.id
    )
    SELECT decade, nhl_player_id, player_name, games_played, points
    FROM totals
    WHERE decade_rank = 1
    ORDER BY decade
  `, [gameType]);
  return rows.map((row) => ({
    decade: row.decade,
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    gamesPlayed: row.games_played,
    points: row.points,
  }));
}

async function getSkaterLeaders(
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

async function getGoalieLeaders(
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

async function getTeamLeaders(
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

export const DEFAULT_HISTORY_FILTERS: HistoryFilters = {
  startYear: 1917,
  endYear: 2025,
  minimumGames: 0,
  position: null,
  team: null,
  country: null,
};

export async function getHistoryFilterOptions(
  gameType: number,
): Promise<HistoryFilterOptions> {
  const [positionRows, teamRows, countryRows] = await Promise.all([
    query<{ value: string }>(`
      SELECT DISTINCT player.position AS value
      FROM historical_skater_season_stats AS stats
      JOIN players AS player ON player.id = stats.player_id
      WHERE stats.game_type = $1
        AND player.position IS NOT NULL
      ORDER BY value
    `, [gameType]),
    query<{ value: string }>(`
      SELECT DISTINCT TRIM(team_abbrev) AS value
      FROM (
        SELECT team_abbrevs FROM historical_skater_season_stats WHERE game_type = $1
        UNION ALL
        SELECT team_abbrevs FROM historical_goalie_season_stats WHERE game_type = $1
      ) AS stats
      CROSS JOIN LATERAL unnest(
        regexp_split_to_array(COALESCE(stats.team_abbrevs, ''), ',\\s*')
      ) AS team_abbrev
      WHERE TRIM(team_abbrev) <> ''
      ORDER BY value
    `, [gameType]),
    query<{ value: string }>(`
      SELECT DISTINCT player.birth_country AS value
      FROM (
        SELECT player_id FROM historical_skater_season_stats WHERE game_type = $1
        UNION
        SELECT player_id FROM historical_goalie_season_stats WHERE game_type = $1
      ) AS stats
      JOIN players AS player ON player.id = stats.player_id
      WHERE player.birth_country IS NOT NULL
      ORDER BY value
    `, [gameType]),
  ]);
  return {
    positions: positionRows.map((row) => row.value),
    teams: teamRows.map((row) => row.value),
    countries: countryRows.map((row) => row.value),
  };
}

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

export function parseHistoryFilters(values: {
  startYear?: string;
  endYear?: string;
  minimumGames?: string;
  position?: string;
  team?: string;
  country?: string;
}): HistoryFilters {
  const requestedStart = boundedInteger(values.startYear, 1917, 2025, 1917);
  const requestedEnd = boundedInteger(values.endYear, 1917, 2025, 2025);
  return {
    startYear: Math.min(requestedStart, requestedEnd),
    endYear: Math.max(requestedStart, requestedEnd),
    minimumGames: boundedInteger(values.minimumGames, 0, 5_000, 0),
    position: cleanFilter(values.position),
    team: cleanFilter(values.team),
    country: cleanFilter(values.country),
  };
}

export function parseHistoryView(value: string | undefined): HistoryView {
  return value === "goalies" || value === "teams" ? value : "skaters";
}

export function parseHistoryMetric(
  view: HistoryView,
  value: string | undefined,
): HistoryMetric {
  if (view === "goalies") return parseGoalieMetric(value);
  if (view === "teams") return parseTeamMetric(value);
  return parseSkaterMetric(value);
}

function parseSkaterMetric(value: string | undefined): SkaterHistoryMetric {
  return value === "goals" ||
    value === "assists" ||
    value === "games" ||
    value === "pointsPerGame"
    ? value
    : "points";
}

function parseGoalieMetric(value: string | undefined): GoalieHistoryMetric {
  return value === "games" ||
    value === "shutouts" ||
    value === "savePercentage"
    ? value
    : "wins";
}

function parseTeamMetric(value: string | undefined): TeamHistoryMetric {
  return value === "wins" || value === "pointPercentage" ? value : "points";
}

function mapSkaterCareer(row: SkaterCareerRow): HistoricalSkaterCareer {
  return {
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    position: row.position,
    seasonsPlayed: row.seasons_played,
    gamesPlayed: row.games_played,
    goals: row.goals,
    assists: row.assists,
    points: row.points,
    pointsPerGame: row.points_per_game,
  };
}

function mapSkaterSeason(row: SkaterSeasonRow): HistoricalSkaterSeason {
  return {
    ...mapSkaterCareer({ ...row, seasons_played: 1 }),
    seasonId: row.season_id,
    gameType: row.game_type,
    teamAbbreviations: row.team_abbrevs,
  };
}

function mapGoalieCareer(row: GoalieCareerRow): HistoricalGoalieCareer {
  return {
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    seasonsPlayed: row.seasons_played,
    gamesPlayed: row.games_played,
    wins: row.wins,
    losses: row.losses,
    shutouts: row.shutouts,
    savePercentage: row.save_percentage,
  };
}

function historyParameters(
  gameType: number,
  filters: HistoryFilters,
  limit: number,
): Array<number | string | null> {
  return [
    gameType,
    seasonIdFromStartYear(filters.startYear),
    seasonIdFromStartYear(filters.endYear),
    filters.minimumGames,
    filters.position,
    filters.team,
    filters.country,
    limit,
  ];
}

function rankedHistoryParameters(
  gameType: number,
  filters: HistoryFilters,
  limit: number,
  offset: number,
): Array<number | string | null> {
  return [...historyParameters(gameType, filters, limit), offset];
}

function seasonIdFromStartYear(year: number): number {
  return year * 10_000 + year + 1;
}

function boundedInteger(
  value: string | undefined,
  minimum: number,
  maximum: number,
  fallback: number,
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
}

function cleanFilter(value: string | undefined): string | null {
  const cleaned = value?.trim();
  return cleaned ? cleaned.slice(0, 20) : null;
}

function mapGoalieSeason(row: GoalieSeasonRow): HistoricalGoalieSeason {
  return {
    ...mapGoalieCareer({ ...row, seasons_played: 1 }),
    seasonId: row.season_id,
    gameType: row.game_type,
    teamAbbreviations: row.team_abbrevs,
    goalsAgainstAverage: row.goals_against_average,
    savePercentage: row.save_percentage,
  };
}

function mapTeamCareer(row: TeamCareerRow): HistoricalTeamCareer {
  return {
    nhlTeamId: row.nhl_team_id,
    name: row.team_name,
    seasonsPlayed: row.seasons_played,
    gamesPlayed: row.games_played,
    wins: row.wins,
    losses: row.losses,
    ties: row.ties,
    overtimeLosses: row.overtime_losses,
    points: row.points,
    pointPercentage: row.point_percentage,
  };
}

function mapTeamSeason(row: TeamSeasonRow): HistoricalTeamSeason {
  return {
    ...mapTeamCareer({ ...row, seasons_played: 1 }),
    seasonId: row.season_id,
    gameType: row.game_type,
    pointPercentage: row.point_percentage,
    goalsFor: row.goals_for,
    goalsAgainst: row.goals_against,
  };
}
