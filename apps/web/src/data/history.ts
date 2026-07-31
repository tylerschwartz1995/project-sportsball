import "server-only";

import type {
  GoalieHistoryMetric,
  HistoricalGoalieCareer,
  HistoricalGoalieLeaders,
  HistoricalGoalieSeason,
  HistoricalPlayerSeasons,
  HistoricalLeaders,
  HistoricalSkaterCareer,
  HistoricalSkaterLeaders,
  HistoricalSkaterSeason,
  HistoricalTeamCareer,
  HistoricalTeamLeaders,
  HistoricalTeamSeason,
  HistoryMetric,
  HistoryFilterOptions,
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
