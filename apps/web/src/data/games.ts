import "server-only";

import type {
  GameBoxScore,
  GameDateSummary,
  GameGoalieStats,
  GameSkaterStats,
  GameSummary,
  LeagueTrendGame,
} from "@/contracts/game";
import type { TeamIdentity } from "@/contracts/team";
import { query } from "@/data/database";

type GameDateRow = {
  game_date: string;
  game_count: number;
};

type ScheduleTeamRow = {
  team_id: number;
  nhl_team_id: number;
  franchise_id: number | null;
  abbreviation: string;
  team_name: string;
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
  away_wins: number;
  away_losses: number;
  away_overtime_losses: number;
  away_score: number | null;
  away_shots_on_goal: number | null;
  home_team_id: number;
  home_nhl_team_id: number;
  home_abbreviation: string;
  home_name: string;
  home_wins: number;
  home_losses: number;
  home_overtime_losses: number;
  home_score: number | null;
  home_shots_on_goal: number | null;
};

type LeagueTrendGameRow = {
  nhl_game_id: number;
  game_date: string;
  start_time_utc: string;
  last_period_type: string | null;
  away_abbreviation: string;
  away_score: number;
  home_abbreviation: string;
  home_score: number;
};

type GameSkaterRow = {
  team_id: number;
  nhl_player_id: number;
  player_name: string;
  sweater_number: number | null;
  position: string;
  goals: number;
  assists: number;
  points: number;
  plus_minus: number;
  penalty_minutes: number;
  hits: number;
  power_play_goals: number;
  shots_on_goal: number;
  faceoff_win_percentage: number | null;
  blocked_shots: number;
  giveaways: number;
  takeaways: number;
  shifts: number;
  time_on_ice_seconds: number | null;
};

type GameGoalieRow = {
  team_id: number;
  nhl_player_id: number;
  player_name: string;
  sweater_number: number | null;
  starter: boolean;
  decision: string | null;
  goals_against: number;
  shots_against: number;
  saves: number;
  save_percentage: number | null;
  even_strength_goals_against: number;
  even_strength_saves: number;
  power_play_goals_against: number;
  power_play_saves: number;
  shorthanded_goals_against: number;
  shorthanded_saves: number;
  time_on_ice_seconds: number | null;
};

function gameRecordJoin(side: "away" | "home"): string {
  return `
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (
          WHERE record_stats.score > record_opponent.score
        )::integer AS wins,
        COUNT(*) FILTER (
          WHERE record_stats.score < record_opponent.score
            AND NOT (
              record_game.game_type = 2
              AND COALESCE(record_game.last_period_type, 'REG') IN ('OT', 'SO')
            )
        )::integer AS losses,
        COUNT(*) FILTER (
          WHERE record_stats.score < record_opponent.score
            AND record_game.game_type = 2
            AND COALESCE(record_game.last_period_type, 'REG') IN ('OT', 'SO')
        )::integer AS overtime_losses
      FROM games AS record_game
      JOIN team_game_stats AS record_stats
        ON record_stats.game_id = record_game.id
       AND record_stats.team_id = game.${side}_team_id
      JOIN team_game_stats AS record_opponent
        ON record_opponent.game_id = record_game.id
       AND record_opponent.team_id <> record_stats.team_id
      WHERE record_game.season_id = game.season_id
        AND record_game.game_type = game.game_type
        AND record_game.state IN ('FINAL', 'OFF')
        AND record_stats.score IS NOT NULL
        AND record_opponent.score IS NOT NULL
        AND (record_game.start_time_utc, record_game.nhl_id)
          <= (game.start_time_utc, game.nhl_id)
    ) AS ${side}_record ON true
  `;
}

const gameSelect = `
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
    COALESCE(away_record.wins, 0)::integer AS away_wins,
    COALESCE(away_record.losses, 0)::integer AS away_losses,
    COALESCE(away_record.overtime_losses, 0)::integer AS away_overtime_losses,
    away_stats.score AS away_score,
    away_stats.shots_on_goal AS away_shots_on_goal,
    home_team.id::integer AS home_team_id,
    home_team.nhl_id AS home_nhl_team_id,
    COALESCE(home_team_season.abbreviation, home_team.abbreviation) AS home_abbreviation,
    COALESCE(home_team_season.full_name, home_team.name) AS home_name,
    COALESCE(home_record.wins, 0)::integer AS home_wins,
    COALESCE(home_record.losses, 0)::integer AS home_losses,
    COALESCE(home_record.overtime_losses, 0)::integer AS home_overtime_losses,
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
  ${gameRecordJoin("away")}
  ${gameRecordJoin("home")}
`;

export async function listGameDates(
  seasonId: number,
  gameType?: number,
  teamNhlId?: number,
): Promise<GameDateSummary[]> {
  const rows = await query<GameDateRow>(
    `
      SELECT
        game_date::text AS game_date,
        COUNT(*)::integer AS game_count
      FROM games
      WHERE season_id = $1
        AND ($2::smallint IS NULL OR game_type = $2)
        AND (
          $3::integer IS NULL
          OR away_team_id = (SELECT id FROM teams WHERE nhl_id = $3)
          OR home_team_id = (SELECT id FROM teams WHERE nhl_id = $3)
        )
      GROUP BY game_date
      ORDER BY
        CASE WHEN game_date >= CURRENT_DATE THEN 0 ELSE 1 END,
        CASE WHEN game_date >= CURRENT_DATE THEN game_date END,
        CASE WHEN game_date < CURRENT_DATE THEN game_date END DESC
    `,
    [seasonId, gameType ?? null, teamNhlId ?? null],
  );

  return rows.map((row) => ({
    date: row.game_date,
    gameCount: row.game_count,
  }));
}

export async function listScheduleTeams(
  seasonId: number,
  gameType?: number,
): Promise<TeamIdentity[]> {
  const rows = await query<ScheduleTeamRow>(
    `
      WITH schedule_teams AS (
        SELECT away_team_id AS team_id
        FROM games
        WHERE season_id = $1
          AND ($2::smallint IS NULL OR game_type = $2)
        UNION
        SELECT home_team_id AS team_id
        FROM games
        WHERE season_id = $1
          AND ($2::smallint IS NULL OR game_type = $2)
      )
      SELECT
        team.id::integer AS team_id,
        team.nhl_id::integer AS nhl_team_id,
        team.franchise_id,
        COALESCE(team_season.abbreviation, team.abbreviation) AS abbreviation,
        COALESCE(team_season.full_name, team.name) AS team_name
      FROM schedule_teams
      JOIN teams AS team
        ON team.id = schedule_teams.team_id
      LEFT JOIN team_seasons AS team_season
        ON team_season.team_id = team.id
       AND team_season.season_id = $1
      ORDER BY team_name
    `,
    [seasonId, gameType ?? null],
  );

  return rows.map((row) => ({
    id: row.team_id,
    nhlTeamId: row.nhl_team_id,
    franchiseId: row.franchise_id,
    abbreviation: row.abbreviation,
    name: row.team_name,
  }));
}

export async function getGamesByDate(
  seasonId: number,
  gameDate: string,
  gameType?: number,
): Promise<GameSummary[]> {
  const rows = await query<GameRow>(
    `
      ${gameSelect}
      WHERE game.season_id = $1
        AND game.game_date = $2::date
        AND ($3::smallint IS NULL OR game.game_type = $3)
      ORDER BY game.start_time_utc, game.nhl_id
    `,
    [seasonId, gameDate, gameType ?? null],
  );

  return rows.map(mapGame);
}

export async function getLatestGamesForSeason(
  seasonId: number,
): Promise<GameSummary[]> {
  const rows = await query<GameRow>(
    `
      ${gameSelect}
      WHERE game.season_id = $1
        AND game.game_date = (
          SELECT MAX(latest.game_date)
          FROM games AS latest
          WHERE latest.season_id = $1
        )
      ORDER BY game.start_time_utc, game.nhl_id
    `,
    [seasonId],
  );

  return rows.map(mapGame);
}

export async function getRecentCompletedGames(
  seasonId: number,
  gameType = 2,
  limit = 60,
): Promise<GameSummary[]> {
  const boundedLimit = Math.min(120, Math.max(1, Math.trunc(limit)));
  const rows = await query<GameRow>(
    `
      WITH recent_games AS MATERIALIZED (
        SELECT recent.id
        FROM games AS recent
        JOIN team_game_stats AS recent_away_stats
          ON recent_away_stats.game_id = recent.id
         AND recent_away_stats.team_id = recent.away_team_id
        JOIN team_game_stats AS recent_home_stats
          ON recent_home_stats.game_id = recent.id
         AND recent_home_stats.team_id = recent.home_team_id
        WHERE recent.season_id = $1
          AND recent.game_type = $2
          AND recent.state IN ('FINAL', 'OFF')
          AND recent_away_stats.score IS NOT NULL
          AND recent_home_stats.score IS NOT NULL
        ORDER BY recent.start_time_utc DESC, recent.nhl_id DESC
        LIMIT $3
      )
      ${gameSelect}
      JOIN recent_games
        ON recent_games.id = game.id
      ORDER BY game.start_time_utc DESC, game.nhl_id DESC
    `,
    [seasonId, gameType, boundedLimit],
  );
  return rows.map(mapGame);
}

export async function getRecentLeagueTrendGames(
  seasonId: number,
  gameType = 2,
  limit = 60,
): Promise<LeagueTrendGame[]> {
  const boundedLimit = Math.min(120, Math.max(1, Math.trunc(limit)));
  const rows = await query<LeagueTrendGameRow>(
    `
      SELECT
        game.nhl_id::integer AS nhl_game_id,
        game.game_date::text AS game_date,
        game.start_time_utc::text AS start_time_utc,
        game.last_period_type,
        COALESCE(away_team_season.abbreviation, away_team.abbreviation) AS away_abbreviation,
        away_stats.score::integer AS away_score,
        COALESCE(home_team_season.abbreviation, home_team.abbreviation) AS home_abbreviation,
        home_stats.score::integer AS home_score
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
      JOIN team_game_stats AS away_stats
        ON away_stats.game_id = game.id
       AND away_stats.team_id = game.away_team_id
      JOIN team_game_stats AS home_stats
        ON home_stats.game_id = game.id
       AND home_stats.team_id = game.home_team_id
      WHERE game.season_id = $1
        AND game.game_type = $2
        AND game.state IN ('FINAL', 'OFF')
        AND away_stats.score IS NOT NULL
        AND home_stats.score IS NOT NULL
      ORDER BY game.start_time_utc DESC, game.nhl_id DESC
      LIMIT $3
    `,
    [seasonId, gameType, boundedLimit],
  );

  return rows.map((row) => ({
    nhlGameId: row.nhl_game_id,
    gameDate: row.game_date,
    startTimeUtc: row.start_time_utc,
    lastPeriodType: row.last_period_type,
    awayTeam: {
      abbreviation: row.away_abbreviation,
      score: row.away_score,
    },
    homeTeam: {
      abbreviation: row.home_abbreviation,
      score: row.home_score,
    },
  }));
}

export async function getGamesForSeasonByType(
  seasonId: number,
  gameType: number,
): Promise<GameSummary[]> {
  const rows = await query<GameRow>(
    `
      ${gameSelect}
      WHERE game.season_id = $1
        AND game.game_type = $2
      ORDER BY game.start_time_utc, game.nhl_id
    `,
    [seasonId, gameType],
  );

  return rows.map(mapGame);
}

export async function getTeamSchedule(
  nhlTeamId: number,
  seasonId: number,
  gameType: number,
): Promise<GameSummary[]> {
  const rows = await query<GameRow>(
    `
      ${gameSelect}
      WHERE game.season_id = $2
        AND game.game_type = $3
        AND (
          away_team.nhl_id = $1
          OR home_team.nhl_id = $1
        )
      ORDER BY game.start_time_utc, game.nhl_id
    `,
    [nhlTeamId, seasonId, gameType],
  );

  return rows.map(mapGame);
}

export async function listTeamScheduleSeasonIds(
  nhlTeamId: number,
): Promise<number[]> {
  const rows = await query<{ season_id: number }>(
    `
      SELECT DISTINCT game.season_id
      FROM games AS game
      JOIN teams AS away_team
        ON away_team.id = game.away_team_id
      JOIN teams AS home_team
        ON home_team.id = game.home_team_id
      WHERE away_team.nhl_id = $1
         OR home_team.nhl_id = $1
      ORDER BY game.season_id DESC
    `,
    [nhlTeamId],
  );

  return rows.map((row) => row.season_id);
}

export async function getUpcomingGamesForTeam(
  nhlTeamId: number,
  seasonId: number,
  gameType: number,
  limit = 5,
): Promise<GameSummary[]> {
  const rows = await query<GameRow>(
    `
      ${gameSelect}
      WHERE game.season_id = $2
        AND game.game_type = $3
        AND (
          away_team.nhl_id = $1
          OR home_team.nhl_id = $1
        )
        AND game.start_time_utc > NOW()
      ORDER BY game.start_time_utc, game.nhl_id
      LIMIT $4
    `,
    [nhlTeamId, seasonId, gameType, limit],
  );

  return rows.map(mapGame);
}

export async function getUpcomingGames(limit = 8): Promise<GameSummary[]> {
  const rows = await query<GameRow>(
    `
      ${gameSelect}
      WHERE game.game_type IN (2, 3)
        AND game.start_time_utc > NOW()
      ORDER BY game.start_time_utc, game.nhl_id
      LIMIT $1
    `,
    [limit],
  );
  return rows.map(mapGame);
}

export async function getGameBoxScore(
  nhlGameId: number,
): Promise<GameBoxScore | null> {
  const [gameRows, skaterRows, goalieRows] = await Promise.all([
    query<GameRow>(
      `
        ${gameSelect}
        WHERE game.nhl_id = $1
      `,
      [nhlGameId],
    ),
    query<GameSkaterRow>(
      `
        SELECT
          stats.team_id,
          player.nhl_id::integer AS nhl_player_id,
          player.display_name AS player_name,
          stats.sweater_number,
          stats.position,
          stats.goals,
          stats.assists,
          stats.points,
          stats.plus_minus,
          stats.penalty_minutes,
          stats.hits,
          stats.power_play_goals,
          stats.shots_on_goal,
          stats.faceoff_win_percentage,
          stats.blocked_shots,
          stats.giveaways,
          stats.takeaways,
          stats.shifts,
          stats.time_on_ice_seconds
        FROM player_game_stats AS stats
        JOIN players AS player
          ON player.id = stats.player_id
        JOIN games AS game
          ON game.id = stats.game_id
        WHERE game.nhl_id = $1
        ORDER BY stats.team_id, stats.points DESC, stats.goals DESC,
                 player.display_name
      `,
      [nhlGameId],
    ),
    query<GameGoalieRow>(
      `
        SELECT
          stats.team_id,
          player.nhl_id::integer AS nhl_player_id,
          player.display_name AS player_name,
          stats.sweater_number,
          stats.starter,
          stats.decision,
          stats.goals_against,
          stats.shots_against,
          stats.saves,
          stats.save_percentage,
          stats.even_strength_goals_against,
          stats.even_strength_saves,
          stats.power_play_goals_against,
          stats.power_play_saves,
          stats.shorthanded_goals_against,
          stats.shorthanded_saves,
          stats.time_on_ice_seconds
        FROM goalie_game_stats AS stats
        JOIN players AS player
          ON player.id = stats.player_id
        JOIN games AS game
          ON game.id = stats.game_id
        WHERE game.nhl_id = $1
        ORDER BY stats.team_id, stats.starter DESC,
                 stats.time_on_ice_seconds DESC, player.display_name
      `,
      [nhlGameId],
    ),
  ]);

  const row = gameRows[0];
  if (!row) {
    return null;
  }

  const game = mapGame(row);
  return {
    ...game,
    awayTeam: {
      ...game.awayTeam,
      skaters: skaterRows
        .filter((player) => player.team_id === row.away_team_id)
        .map(mapGameSkater),
      goalies: goalieRows
        .filter((player) => player.team_id === row.away_team_id)
        .map(mapGameGoalie),
    },
    homeTeam: {
      ...game.homeTeam,
      skaters: skaterRows
        .filter((player) => player.team_id === row.home_team_id)
        .map(mapGameSkater),
      goalies: goalieRows
        .filter((player) => player.team_id === row.home_team_id)
        .map(mapGameGoalie),
    },
  };
}

function mapGame(row: GameRow): GameSummary {
  return {
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
      record: {
        wins: row.away_wins,
        losses: row.away_losses,
        overtimeLosses: row.away_overtime_losses,
      },
      score: row.away_score,
      shotsOnGoal: row.away_shots_on_goal,
    },
    homeTeam: {
      id: row.home_team_id,
      nhlTeamId: row.home_nhl_team_id,
      abbreviation: row.home_abbreviation,
      name: row.home_name,
      record: {
        wins: row.home_wins,
        losses: row.home_losses,
        overtimeLosses: row.home_overtime_losses,
      },
      score: row.home_score,
      shotsOnGoal: row.home_shots_on_goal,
    },
  };
}

function mapGameSkater(row: GameSkaterRow): GameSkaterStats {
  return {
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    sweaterNumber: row.sweater_number,
    position: row.position,
    goals: row.goals,
    assists: row.assists,
    points: row.points,
    plusMinus: row.plus_minus,
    penaltyMinutes: row.penalty_minutes,
    hits: row.hits,
    powerPlayGoals: row.power_play_goals,
    shotsOnGoal: row.shots_on_goal,
    faceoffWinPercentage: row.faceoff_win_percentage,
    blockedShots: row.blocked_shots,
    giveaways: row.giveaways,
    takeaways: row.takeaways,
    shifts: row.shifts,
    timeOnIceSeconds: row.time_on_ice_seconds,
  };
}

function mapGameGoalie(row: GameGoalieRow): GameGoalieStats {
  return {
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    sweaterNumber: row.sweater_number,
    starter: row.starter,
    decision: row.decision,
    goalsAgainst: row.goals_against,
    shotsAgainst: row.shots_against,
    saves: row.saves,
    savePercentage: row.save_percentage,
    evenStrengthGoalsAgainst: row.even_strength_goals_against,
    evenStrengthSaves: row.even_strength_saves,
    powerPlayGoalsAgainst: row.power_play_goals_against,
    powerPlaySaves: row.power_play_saves,
    shorthandedGoalsAgainst: row.shorthanded_goals_against,
    shorthandedSaves: row.shorthanded_saves,
    timeOnIceSeconds: row.time_on_ice_seconds,
  };
}
