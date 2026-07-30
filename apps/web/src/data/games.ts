import "server-only";

import type { GameDateSummary, GameSummary } from "@/contracts/game";
import { query } from "@/data/database";

type GameDateRow = {
  game_date: string;
  game_count: number;
};

type GameRow = {
  id: number;
  nhl_game_id: number;
  season_id: number;
  game_type: number;
  game_date: string;
  start_time_utc: string;
  state: string;
  last_period_type: string | null;
  away_team_id: number;
  away_nhl_team_id: number;
  away_abbreviation: string;
  away_name: string;
  away_score: number | null;
  away_shots_on_goal: number | null;
  home_team_id: number;
  home_nhl_team_id: number;
  home_abbreviation: string;
  home_name: string;
  home_score: number | null;
  home_shots_on_goal: number | null;
};

export async function listGameDates(
  seasonId: number,
): Promise<GameDateSummary[]> {
  const rows = await query<GameDateRow>(
    `
      SELECT
        game_date::text AS game_date,
        COUNT(*)::integer AS game_count
      FROM games
      WHERE season_id = $1
      GROUP BY game_date
      ORDER BY game_date DESC
    `,
    [seasonId],
  );

  return rows.map((row) => ({
    date: row.game_date,
    gameCount: row.game_count,
  }));
}

export async function getGamesByDate(
  seasonId: number,
  gameDate: string,
): Promise<GameSummary[]> {
  const rows = await query<GameRow>(
    `
      SELECT
        game.id::integer AS id,
        game.nhl_id::integer AS nhl_game_id,
        game.season_id,
        game.game_type,
        game.game_date::text AS game_date,
        game.start_time_utc::text AS start_time_utc,
        game.state,
        game.last_period_type,
        away_team.id::integer AS away_team_id,
        away_team.nhl_id AS away_nhl_team_id,
        COALESCE(away_team_season.abbreviation, away_team.abbreviation) AS away_abbreviation,
        COALESCE(away_team_season.full_name, away_team.name) AS away_name,
        away_stats.score AS away_score,
        away_stats.shots_on_goal AS away_shots_on_goal,
        home_team.id::integer AS home_team_id,
        home_team.nhl_id AS home_nhl_team_id,
        COALESCE(home_team_season.abbreviation, home_team.abbreviation) AS home_abbreviation,
        COALESCE(home_team_season.full_name, home_team.name) AS home_name,
        home_stats.score AS home_score,
        home_stats.shots_on_goal AS home_shots_on_goal
      FROM games AS game
      JOIN teams AS away_team
        ON away_team.id = game.away_team_id
      JOIN teams AS home_team
        ON home_team.id = game.home_team_id
      LEFT JOIN team_seasons AS away_team_season
        ON away_team_season.team_id = away_team.id
       AND away_team_season.season_id = game.season_id
      LEFT JOIN team_seasons AS home_team_season
        ON home_team_season.team_id = home_team.id
       AND home_team_season.season_id = game.season_id
      LEFT JOIN team_game_stats AS away_stats
        ON away_stats.game_id = game.id
       AND away_stats.team_id = game.away_team_id
      LEFT JOIN team_game_stats AS home_stats
        ON home_stats.game_id = game.id
       AND home_stats.team_id = game.home_team_id
      WHERE game.season_id = $1
        AND game.game_date = $2::date
      ORDER BY game.start_time_utc, game.nhl_id
    `,
    [seasonId, gameDate],
  );

  return rows.map((row) => ({
    id: row.id,
    nhlGameId: row.nhl_game_id,
    seasonId: row.season_id,
    gameType: row.game_type,
    gameDate: row.game_date,
    startTimeUtc: row.start_time_utc,
    state: row.state,
    lastPeriodType: row.last_period_type,
    awayTeam: {
      id: row.away_team_id,
      nhlTeamId: row.away_nhl_team_id,
      abbreviation: row.away_abbreviation,
      name: row.away_name,
      score: row.away_score,
      shotsOnGoal: row.away_shots_on_goal,
    },
    homeTeam: {
      id: row.home_team_id,
      nhlTeamId: row.home_nhl_team_id,
      abbreviation: row.home_abbreviation,
      name: row.home_name,
      score: row.home_score,
      shotsOnGoal: row.home_shots_on_goal,
    },
  }));
}
