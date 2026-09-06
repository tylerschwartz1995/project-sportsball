import type {
  GoalieHistoryMetric,
  HistoricalGoalieCareer,
  HistoricalGoalieSeason,
  HistoricalSkaterCareer,
  HistoricalSkaterSeason,
  HistoricalTeamCareer,
  HistoricalTeamSeason,
  HistoryDisplay,
  HistoryFilters,
  HistoryMetric,
  HistoryView,
  SkaterHistoryMetric,
  TeamHistoryMetric
} from "@/contracts/history";
import "server-only";
export type SkaterCareerRow = {
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

export type SkaterSeasonRow = Omit<SkaterCareerRow, "seasons_played"> & {
  season_id: number;
  game_type: number;
  team_abbrevs: string | null;
};

export type GoalieCareerRow = {
  nhl_player_id: number;
  player_name: string;
  seasons_played: number;
  games_played: number;
  wins: number;
  losses: number;
  shutouts: number;
  save_percentage: number | null;
};

export type GoalieSeasonRow = Omit<GoalieCareerRow, "seasons_played"> & {
  season_id: number;
  game_type: number;
  team_abbrevs: string | null;
  goals_against_average: number | null;
  save_percentage: number | null;
};

export type TeamCareerRow = {
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

export type TeamSeasonRow = Omit<TeamCareerRow, "seasons_played"> & {
  season_id: number;
  game_type: number;
  point_percentage: number | null;
  goals_for: number;
  goals_against: number;
};

export type RankedRow = {
  rank: number;
  total_count: number;
};

export type PeakRow = RankedRow & {
  nhl_player_id: number;
  player_name: string;
  position: string | null;
  start_season_id: number;
  end_season_id: number;
  games_played: number;
  metric_value: number;
};

export type EraScoreRow = RankedRow & {
  nhl_player_id: number;
  player_name: string;
  position: string | null;
  games_played: number;
  points: number;
  era_score: number;
};

export type GoalieEraScoreRow = RankedRow & {
  nhl_player_id: number;
  player_name: string;
  games_played: number;
  save_percentage: number;
  save_index: number;
};

export const SKATER_METRICS: Record<SkaterHistoryMetric, string> = {
  points: "points",
  goals: "goals",
  assists: "assists",
  games: "games_played",
  pointsPerGame: "points_per_game",
};

export const GOALIE_METRICS: Record<GoalieHistoryMetric, string> = {
  wins: "wins",
  games: "games_played",
  shutouts: "shutouts",
  savePercentage: "save_percentage",
};

export const TEAM_METRICS: Record<TeamHistoryMetric, string> = {
  points: "points",
  wins: "wins",
  pointPercentage: "point_percentage",
};

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

export const DEFAULT_HISTORY_FILTERS: HistoryFilters = {
  startYear: 1917,
  endYear: 2025,
  minimumGames: 0,
  position: null,
  team: null,
  country: null,
};

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

export function parseSkaterMetric(value: string | undefined): SkaterHistoryMetric {
  return value === "goals" ||
    value === "assists" ||
    value === "games" ||
    value === "pointsPerGame"
    ? value
    : "points";
}

export function parseGoalieMetric(value: string | undefined): GoalieHistoryMetric {
  return value === "games" ||
    value === "shutouts" ||
    value === "savePercentage"
    ? value
    : "wins";
}

export function parseTeamMetric(value: string | undefined): TeamHistoryMetric {
  return value === "wins" || value === "pointPercentage" ? value : "points";
}

export function mapSkaterCareer(row: SkaterCareerRow): HistoricalSkaterCareer {
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

export function mapSkaterSeason(row: SkaterSeasonRow): HistoricalSkaterSeason {
  return {
    ...mapSkaterCareer({ ...row, seasons_played: 1 }),
    seasonId: row.season_id,
    gameType: row.game_type,
    teamAbbreviations: row.team_abbrevs,
  };
}

export function mapGoalieCareer(row: GoalieCareerRow): HistoricalGoalieCareer {
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

export function historyParameters(
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

export function rankedHistoryParameters(
  gameType: number,
  filters: HistoryFilters,
  limit: number,
  offset: number,
): Array<number | string | null> {
  return [...historyParameters(gameType, filters, limit), offset];
}

export function seasonIdFromStartYear(year: number): number {
  return year * 10_000 + year + 1;
}

export function boundedInteger(
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

export function cleanFilter(value: string | undefined): string | null {
  const cleaned = value?.trim();
  return cleaned ? cleaned.slice(0, 20) : null;
}

export function mapGoalieSeason(row: GoalieSeasonRow): HistoricalGoalieSeason {
  return {
    ...mapGoalieCareer({ ...row, seasons_played: 1 }),
    seasonId: row.season_id,
    gameType: row.game_type,
    teamAbbreviations: row.team_abbrevs,
    goalsAgainstAverage: row.goals_against_average,
    savePercentage: row.save_percentage,
  };
}

export function mapTeamCareer(row: TeamCareerRow): HistoricalTeamCareer {
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

export function mapTeamSeason(row: TeamSeasonRow): HistoricalTeamSeason {
  return {
    ...mapTeamCareer({ ...row, seasons_played: 1 }),
    seasonId: row.season_id,
    gameType: row.game_type,
    pointPercentage: row.point_percentage,
    goalsFor: row.goals_for,
    goalsAgainst: row.goals_against,
  };
}
