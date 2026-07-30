import "server-only";

import type {
  AdvancedGoalieLeaderboardRow,
  AdvancedPlayerIdentity,
  AdvancedSkaterLeaderboardRow,
  AdvancedTeamLeaderboardRow,
} from "@/contracts/advanced-leaderboard";
import type { TeamIdentity } from "@/contracts/team";
import { query } from "@/data/database";

type TeamRow = {
  team_id: number;
  nhl_team_id: number;
  franchise_id: number | null;
  abbreviation: string;
  team_name: string;
  situation: string;
  games_played: number;
  ice_time_seconds: number;
  x_goals_percentage: number | null;
  corsi_percentage: number | null;
  fenwick_percentage: number | null;
  x_goals_for: number | null;
  x_goals_against: number | null;
  goals_for: number | null;
  goals_against: number | null;
};

type PlayerRow = {
  nhl_player_id: number;
  player_name: string;
  position: string | null;
  team_id: number;
  nhl_team_id: number;
  franchise_id: number | null;
  abbreviation: string;
  team_name: string;
  situation: string;
  games_played: number;
  ice_time_seconds: number;
};

type SkaterRow = PlayerRow & {
  game_score: number | null;
  on_ice_x_goals_percentage: number | null;
  on_ice_corsi_percentage: number | null;
  on_ice_fenwick_percentage: number | null;
  individual_x_goals: number | null;
  individual_goals: number | null;
  individual_points: number | null;
};

type GoalieRow = PlayerRow & {
  expected_goals_against: number | null;
  goals_against: number | null;
  goals_saved_above_expected: number | null;
  expected_shots_on_goal_against: number | null;
  shots_on_goal_against: number | null;
};

const teamIdentitySelect = `
  team.id AS team_id,
  team.nhl_id AS nhl_team_id,
  team.franchise_id,
  COALESCE(team_season.abbreviation, team.abbreviation) AS abbreviation,
  COALESCE(team_season.full_name, team.name) AS team_name
`;

const playerIdentitySelect = `
  player.nhl_id::integer AS nhl_player_id,
  player.display_name AS player_name,
  COALESCE(stats.position, player.position) AS position
`;

const seasonIdentityJoin = `
  JOIN teams AS team
    ON team.id = stats.team_id
  LEFT JOIN team_seasons AS team_season
    ON team_season.team_id = team.id
   AND team_season.season_id = stats.season_id
`;

export async function listAdvancedTeamLeaders(
  seasonId: number,
  situation: string,
): Promise<AdvancedTeamLeaderboardRow[]> {
  const rows = await query<TeamRow>(
    `
      SELECT
        ${teamIdentitySelect},
        stats.situation,
        stats.games_played,
        stats.ice_time_seconds,
        stats.x_goals_percentage,
        stats.corsi_percentage,
        stats.fenwick_percentage,
        stats.x_goals_for,
        stats.x_goals_against,
        stats.goals_for,
        stats.goals_against
      FROM moneypuck_team_season_stats AS stats
      ${seasonIdentityJoin}
      WHERE stats.season_id = $1
        AND stats.situation = $2
      ORDER BY stats.x_goals_percentage DESC NULLS LAST, team_name
    `,
    [seasonId, situation],
  );

  return rows.map((row) => ({
    team: mapTeam(row),
    situation: row.situation,
    gamesPlayed: row.games_played,
    iceTimeSeconds: row.ice_time_seconds,
    expectedGoalsPercentage: row.x_goals_percentage,
    corsiPercentage: row.corsi_percentage,
    fenwickPercentage: row.fenwick_percentage,
    expectedGoalsFor: row.x_goals_for,
    expectedGoalsAgainst: row.x_goals_against,
    goalsFor: row.goals_for,
    goalsAgainst: row.goals_against,
  }));
}

export async function listAdvancedSkaterLeaders(
  seasonId: number,
  situation: string,
  minimumIceTimeSeconds: number,
): Promise<AdvancedSkaterLeaderboardRow[]> {
  const rows = await query<SkaterRow>(
    `
      SELECT
        ${playerIdentitySelect},
        ${teamIdentitySelect},
        stats.situation,
        stats.games_played,
        stats.ice_time_seconds,
        stats.game_score,
        stats.on_ice_x_goals_percentage,
        stats.on_ice_corsi_percentage,
        stats.on_ice_fenwick_percentage,
        stats.individual_x_goals,
        stats.individual_goals,
        stats.individual_points
      FROM moneypuck_skater_season_stats AS stats
      JOIN players AS player
        ON player.id = stats.player_id
      ${seasonIdentityJoin}
      WHERE stats.season_id = $1
        AND stats.situation = $2
        AND stats.ice_time_seconds >= $3
      ORDER BY stats.game_score DESC NULLS LAST, player_name, team_name
      LIMIT 200
    `,
    [seasonId, situation, minimumIceTimeSeconds],
  );

  return rows.map((row) => ({
    player: mapPlayer(row),
    team: mapTeam(row),
    situation: row.situation,
    gamesPlayed: row.games_played,
    iceTimeSeconds: row.ice_time_seconds,
    gameScore: row.game_score,
    onIceExpectedGoalsPercentage: row.on_ice_x_goals_percentage,
    onIceCorsiPercentage: row.on_ice_corsi_percentage,
    onIceFenwickPercentage: row.on_ice_fenwick_percentage,
    individualExpectedGoals: row.individual_x_goals,
    individualGoals: row.individual_goals,
    individualPoints: row.individual_points,
  }));
}

export async function listAdvancedGoalieLeaders(
  seasonId: number,
  situation: string,
  minimumIceTimeSeconds: number,
): Promise<AdvancedGoalieLeaderboardRow[]> {
  const rows = await query<GoalieRow>(
    `
      SELECT
        player.nhl_id::integer AS nhl_player_id,
        player.display_name AS player_name,
        player.position,
        ${teamIdentitySelect},
        stats.situation,
        stats.games_played,
        stats.ice_time_seconds,
        stats.expected_goals_against,
        stats.goals_against,
        CASE
          WHEN stats.expected_goals_against IS NULL
            OR stats.goals_against IS NULL
          THEN NULL
          ELSE stats.expected_goals_against - stats.goals_against
        END AS goals_saved_above_expected,
        stats.expected_shots_on_goal_against,
        stats.shots_on_goal_against
      FROM moneypuck_goalie_season_stats AS stats
      JOIN players AS player
        ON player.id = stats.player_id
      ${seasonIdentityJoin}
      WHERE stats.season_id = $1
        AND stats.situation = $2
        AND stats.ice_time_seconds >= $3
      ORDER BY goals_saved_above_expected DESC NULLS LAST,
               player_name, team_name
      LIMIT 200
    `,
    [seasonId, situation, minimumIceTimeSeconds],
  );

  return rows.map((row) => ({
    player: mapPlayer(row),
    team: mapTeam(row),
    situation: row.situation,
    gamesPlayed: row.games_played,
    iceTimeSeconds: row.ice_time_seconds,
    expectedGoalsAgainst: row.expected_goals_against,
    goalsAgainst: row.goals_against,
    goalsSavedAboveExpected: row.goals_saved_above_expected,
    expectedShotsOnGoalAgainst: row.expected_shots_on_goal_against,
    shotsOnGoalAgainst: row.shots_on_goal_against,
  }));
}

function mapTeam(row: TeamRow | PlayerRow): TeamIdentity {
  return {
    id: row.team_id,
    nhlTeamId: row.nhl_team_id,
    franchiseId: row.franchise_id,
    abbreviation: row.abbreviation,
    name: row.team_name,
  };
}

function mapPlayer(row: PlayerRow): AdvancedPlayerIdentity {
  return {
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    position: row.position,
  };
}
