import "server-only";

import type {
  TeamGoalieSplit,
  TeamIdentity,
  TeamSeasonDetail,
  TeamSeasonStats,
  TeamSeasonSummary,
  TeamSkaterSplit,
} from "@/contracts/team";
import { query } from "@/data/database";

type TeamStatsRow = {
  team_id: number;
  nhl_team_id: number;
  franchise_id: number | null;
  abbreviation: string;
  team_name: string;
  season_id: number;
  game_type: number;
  games_played: number;
  wins: number;
  losses: number;
  regulation_wins: number;
  overtime_wins: number;
  shootout_wins: number;
  regulation_losses: number;
  overtime_losses: number;
  shootout_losses: number;
  standings_points: number;
  goals_for: number;
  goals_against: number;
  shots_for: number;
  shots_against: number;
};

type TeamSkaterRow = {
  nhl_player_id: number;
  player_name: string;
  position: string | null;
  games_played: number;
  goals: number | null;
  assists: number | null;
  points: number | null;
  plus_minus: number | null;
  penalty_minutes: number | null;
};

type TeamGoalieRow = {
  nhl_player_id: number;
  player_name: string;
  games_played: number;
  games_started: number | null;
  wins: number | null;
  losses: number | null;
  overtime_losses: number | null;
  goals_against_average: number | null;
  save_percentage: number | null;
  shutouts: number | null;
};

type TeamIdentityRow = {
  team_id: number;
  nhl_team_id: number;
  franchise_id: number | null;
  abbreviation: string;
  team_name: string;
};

const teamStatsSelect = `
  SELECT
    team.id AS team_id,
    team.nhl_id AS nhl_team_id,
    team.franchise_id,
    COALESCE(team_season.abbreviation, team.abbreviation) AS abbreviation,
    COALESCE(team_season.full_name, team.name) AS team_name,
    stats.season_id,
    stats.game_type,
    stats.games_played,
    stats.wins,
    stats.losses,
    stats.regulation_wins,
    stats.overtime_wins,
    stats.shootout_wins,
    stats.regulation_losses,
    stats.overtime_losses,
    stats.shootout_losses,
    stats.standings_points,
    stats.goals_for,
    stats.goals_against,
    stats.shots_for,
    stats.shots_against
  FROM team_season_stats AS stats
  JOIN teams AS team
    ON team.id = stats.team_id
  LEFT JOIN team_seasons AS team_season
    ON team_season.team_id = team.id
   AND team_season.season_id = stats.season_id
`;

export async function listTeamsBySeason(
  seasonId: number,
  gameType = 2,
): Promise<TeamSeasonSummary[]> {
  const rows = await query<TeamStatsRow>(
    `
      ${teamStatsSelect}
      WHERE stats.season_id = $1
        AND stats.game_type = $2
      ORDER BY stats.standings_points DESC, stats.wins DESC, team_name
    `,
    [seasonId, gameType],
  );

  return rows.map((row) => ({
    team: mapTeamIdentity(row),
    stats: mapTeamStats(row),
  }));
}

export async function listTeamSeasonIds(
  nhlTeamId: number,
): Promise<number[]> {
  const rows = await query<{ season_id: number }>(
    `
      SELECT DISTINCT stats.season_id
      FROM team_season_stats AS stats
      JOIN teams AS team
        ON team.id = stats.team_id
      WHERE team.nhl_id = $1
      ORDER BY stats.season_id DESC
    `,
    [nhlTeamId],
  );

  return rows.map((row) => row.season_id);
}

export async function getTeamIdentityForSeason(
  nhlTeamId: number,
  seasonId: number,
): Promise<TeamIdentity | null> {
  const rows = await query<TeamIdentityRow>(
    `
      SELECT
        team.id::integer AS team_id,
        team.nhl_id::integer AS nhl_team_id,
        team.franchise_id,
        COALESCE(team_season.abbreviation, team.abbreviation) AS abbreviation,
        COALESCE(team_season.full_name, team.name) AS team_name
      FROM teams AS team
      LEFT JOIN team_seasons AS team_season
        ON team_season.team_id = team.id
       AND team_season.season_id = $2
      WHERE team.nhl_id = $1
      LIMIT 1
    `,
    [nhlTeamId, seasonId],
  );
  const row = rows[0];
  return row
    ? {
        id: row.team_id,
        nhlTeamId: row.nhl_team_id,
        franchiseId: row.franchise_id,
        abbreviation: row.abbreviation,
        name: row.team_name,
      }
    : null;
}

export async function getTeamSeasonDetail(
  nhlTeamId: number,
  seasonId: number,
  rosterGameType = 2,
): Promise<TeamSeasonDetail | null> {
  const [statsRows, skaterRows, goalieRows] = await Promise.all([
    query<TeamStatsRow>(
      `
        ${teamStatsSelect}
        WHERE team.nhl_id = $1
          AND stats.season_id = $2
        ORDER BY stats.game_type
      `,
      [nhlTeamId, seasonId],
    ),
    query<TeamSkaterRow>(
      `
        SELECT
          player.nhl_id::integer AS nhl_player_id,
          player.display_name AS player_name,
          player.position,
          split.games_played,
          split.goals,
          split.assists,
          split.points,
          split.plus_minus,
          split.penalty_minutes
        FROM official_skater_season_stats AS split
        JOIN players AS player
          ON player.id = split.player_id
        JOIN teams AS team
          ON team.id = split.team_id
        WHERE team.nhl_id = $1
          AND split.season_id = $2
          AND split.game_type = $3
        ORDER BY split.points DESC NULLS LAST,
                 split.goals DESC NULLS LAST,
                 player.display_name
      `,
      [nhlTeamId, seasonId, rosterGameType],
    ),
    query<TeamGoalieRow>(
      `
        SELECT
          player.nhl_id::integer AS nhl_player_id,
          player.display_name AS player_name,
          split.games_played,
          split.games_started,
          split.wins,
          split.losses,
          split.overtime_losses,
          split.goals_against_average,
          split.save_percentage,
          split.shutouts
        FROM official_goalie_season_stats AS split
        JOIN players AS player
          ON player.id = split.player_id
        JOIN teams AS team
          ON team.id = split.team_id
        WHERE team.nhl_id = $1
          AND split.season_id = $2
          AND split.game_type = $3
        ORDER BY split.games_played DESC, player.display_name
      `,
      [nhlTeamId, seasonId, rosterGameType],
    ),
  ]);

  const firstRow = statsRows[0];
  if (!firstRow) {
    return null;
  }

  const statsByType = new Map(
    statsRows.map((row) => [row.game_type, mapTeamStats(row)]),
  );

  return {
    team: mapTeamIdentity(firstRow),
    seasonId,
    regularSeason: statsByType.get(2) ?? null,
    playoffs: statsByType.get(3) ?? null,
    skaters: skaterRows.map(mapTeamSkater),
    goalies: goalieRows.map(mapTeamGoalie),
  };
}

function mapTeamIdentity(row: TeamStatsRow): TeamIdentity {
  return {
    id: row.team_id,
    nhlTeamId: row.nhl_team_id,
    franchiseId: row.franchise_id,
    abbreviation: row.abbreviation,
    name: row.team_name,
  };
}

function mapTeamStats(row: TeamStatsRow): TeamSeasonStats {
  return {
    seasonId: row.season_id,
    gameType: row.game_type,
    gamesPlayed: row.games_played,
    wins: row.wins,
    losses: row.losses,
    regulationWins: row.regulation_wins,
    overtimeWins: row.overtime_wins,
    shootoutWins: row.shootout_wins,
    regulationLosses: row.regulation_losses,
    overtimeLosses: row.overtime_losses,
    shootoutLosses: row.shootout_losses,
    standingsPoints: row.standings_points,
    goalsFor: row.goals_for,
    goalsAgainst: row.goals_against,
    shotsFor: row.shots_for,
    shotsAgainst: row.shots_against,
  };
}

function mapTeamSkater(row: TeamSkaterRow): TeamSkaterSplit {
  return {
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    position: row.position,
    gamesPlayed: row.games_played,
    goals: row.goals,
    assists: row.assists,
    points: row.points,
    plusMinus: row.plus_minus,
    penaltyMinutes: row.penalty_minutes,
  };
}

function mapTeamGoalie(row: TeamGoalieRow): TeamGoalieSplit {
  return {
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    gamesPlayed: row.games_played,
    gamesStarted: row.games_started,
    wins: row.wins,
    losses: row.losses,
    overtimeLosses: row.overtime_losses,
    goalsAgainstAverage: row.goals_against_average,
    savePercentage: row.save_percentage,
    shutouts: row.shutouts,
  };
}
