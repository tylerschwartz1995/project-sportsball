import "server-only";

import type {
  GoalieHistoryMetric,
  HistoricalGoalieCareer,
  HistoricalGoalieLeaders,
  HistoricalGoalieSeason,
  HistoricalLeaders,
  HistoricalSkaterCareer,
  HistoricalSkaterLeaders,
  HistoricalSkaterSeason,
  HistoricalTeamCareer,
  HistoricalTeamLeaders,
  HistoricalTeamSeason,
  HistoryMetric,
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
};

type SkaterSeasonRow = Omit<SkaterCareerRow, "seasons_played"> & {
  season_id: number;
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
};

type GoalieSeasonRow = Omit<GoalieCareerRow, "seasons_played"> & {
  season_id: number;
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
};

type TeamSeasonRow = Omit<TeamCareerRow, "seasons_played"> & {
  season_id: number;
  point_percentage: number | null;
  goals_for: number;
  goals_against: number;
};

const SKATER_METRICS: Record<SkaterHistoryMetric, string> = {
  points: "points",
  goals: "goals",
  assists: "assists",
  games: "games_played",
};
const GOALIE_METRICS: Record<GoalieHistoryMetric, string> = {
  wins: "wins",
  games: "games_played",
  shutouts: "shutouts",
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
  limit = 100,
): Promise<HistoricalLeaders> {
  if (view === "goalies") {
    return getGoalieLeaders(parseGoalieMetric(metric), gameType, limit);
  }
  if (view === "teams") {
    return getTeamLeaders(parseTeamMetric(metric), gameType, limit);
  }
  return getSkaterLeaders(parseSkaterMetric(metric), gameType, limit);
}

async function getSkaterLeaders(
  metric: SkaterHistoryMetric,
  gameType: number,
  limit: number,
): Promise<HistoricalSkaterLeaders> {
  const column = SKATER_METRICS[metric];
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
          SUM(stats.points)::integer AS points
        FROM historical_skater_season_stats AS stats
        JOIN players AS player ON player.id = stats.player_id
        WHERE stats.game_type = $1
        GROUP BY player.id
        ORDER BY SUM(stats.${column}) DESC, player.display_name
        LIMIT $2
      `,
      [gameType, limit],
    ),
    query<SkaterSeasonRow>(
      `
        SELECT
          player.nhl_id::integer AS nhl_player_id,
          player.display_name AS player_name,
          player.position,
          stats.season_id,
          stats.team_abbrevs,
          stats.games_played,
          stats.goals,
          stats.assists,
          stats.points
        FROM historical_skater_season_stats AS stats
        JOIN players AS player ON player.id = stats.player_id
        WHERE stats.game_type = $1
        ORDER BY stats.${column} DESC, player.display_name
        LIMIT $2
      `,
      [gameType, limit],
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
  limit: number,
): Promise<HistoricalGoalieLeaders> {
  const column = GOALIE_METRICS[metric];
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
          SUM(stats.shutouts)::integer AS shutouts
        FROM historical_goalie_season_stats AS stats
        JOIN players AS player ON player.id = stats.player_id
        WHERE stats.game_type = $1
        GROUP BY player.id
        ORDER BY SUM(stats.${column}) DESC, player.display_name
        LIMIT $2
      `,
      [gameType, limit],
    ),
    query<GoalieSeasonRow>(
      `
        SELECT
          player.nhl_id::integer AS nhl_player_id,
          player.display_name AS player_name,
          stats.season_id,
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
        ORDER BY stats.${column} DESC, player.display_name
        LIMIT $2
      `,
      [gameType, limit],
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
  limit: number,
): Promise<HistoricalTeamLeaders> {
  const column = TEAM_METRICS[metric];
  const careerOrder = metric === "pointPercentage" ? "SUM(points)" : `SUM(${column})`;
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
          SUM(stats.points)::integer AS points
        FROM historical_team_season_stats AS stats
        WHERE stats.game_type = $1
        GROUP BY stats.nhl_team_id
        ORDER BY ${careerOrder} DESC, team_name
        LIMIT $2
      `,
      [gameType, limit],
    ),
    query<TeamSeasonRow>(
      `
        SELECT
          stats.nhl_team_id,
          stats.team_name,
          stats.season_id,
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
        ORDER BY stats.${column} DESC NULLS LAST, stats.team_name
        LIMIT $2
      `,
      [gameType, limit],
    ),
  ]);
  return {
    view: "teams",
    metric,
    careers: careerRows.map(mapTeamCareer),
    seasons: seasonRows.map(mapTeamSeason),
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
  return value === "goals" || value === "assists" || value === "games"
    ? value
    : "points";
}

function parseGoalieMetric(value: string | undefined): GoalieHistoryMetric {
  return value === "games" || value === "shutouts" ? value : "wins";
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
  };
}

function mapSkaterSeason(row: SkaterSeasonRow): HistoricalSkaterSeason {
  return {
    ...mapSkaterCareer({ ...row, seasons_played: 1 }),
    seasonId: row.season_id,
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
  };
}

function mapGoalieSeason(row: GoalieSeasonRow): HistoricalGoalieSeason {
  return {
    ...mapGoalieCareer({ ...row, seasons_played: 1 }),
    seasonId: row.season_id,
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
  };
}

function mapTeamSeason(row: TeamSeasonRow): HistoricalTeamSeason {
  return {
    ...mapTeamCareer({ ...row, seasons_played: 1 }),
    seasonId: row.season_id,
    pointPercentage: row.point_percentage,
    goalsFor: row.goals_for,
    goalsAgainst: row.goals_against,
  };
}
