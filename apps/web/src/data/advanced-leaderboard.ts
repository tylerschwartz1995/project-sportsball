import { perSixty } from "@/lib/per-sixty";
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
  high_danger_x_goals_for: number | null;
  high_danger_x_goals_against: number | null;
  x_goals_percentage: number | null;
  corsi_percentage: number | null;
  fenwick_percentage: number | null;
  x_goals_for: number | null;
  x_goals_against: number | null;
  pdo: number | null;
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
  on_ice_x_goals_for: number | null;
  on_ice_x_goals_against: number | null;
  hd_for: number | null;
  hd_against: number | null;
};

type GoalieRow = PlayerRow & {
  hd_saved: number | null;
  md_saved: number | null;
  ld_saved: number | null;
  rebounds: number | null;
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
  gameType = 2,
): Promise<AdvancedTeamLeaderboardRow[]> {
  const rows = await query<TeamRow>(
    gameType === 2
      ? `
      SELECT
        ${teamIdentitySelect},
        stats.situation,
        stats.games_played,
        stats.ice_time_seconds,
        (stats.metrics->>'highDangerxGoalsFor')::double precision AS high_danger_x_goals_for,
        (stats.metrics->>'highDangerxGoalsAgainst')::double precision AS high_danger_x_goals_against,
        stats.x_goals_percentage,
        stats.corsi_percentage,
        stats.fenwick_percentage,
        stats.x_goals_for,
        stats.x_goals_against,
        stats.goals_for,
        stats.goals_against,
        100 * (stats.goals_for / NULLIF((stats.metrics->>'shotsOnGoalFor')::double precision, 0)
          + 1 - stats.goals_against / NULLIF((stats.metrics->>'shotsOnGoalAgainst')::double precision, 0)) AS pdo
      FROM moneypuck_team_season_stats AS stats
      ${seasonIdentityJoin}
      WHERE stats.season_id = $1
        AND stats.situation = $2
      ORDER BY stats.x_goals_percentage DESC NULLS LAST, team_name
    `
      : `
      SELECT
        ${teamIdentitySelect},
        stats.situation,
        COUNT(DISTINCT stats.game_id)::integer AS games_played,
        SUM(stats.ice_time_seconds) AS ice_time_seconds,
        CASE
          WHEN SUM(stats.x_goals_for + stats.x_goals_against) = 0 THEN NULL
          ELSE SUM(stats.x_goals_for) /
            SUM(stats.x_goals_for + stats.x_goals_against)
        END AS x_goals_percentage,
        CASE
          WHEN SUM(stats.shot_attempts_for + stats.shot_attempts_against) = 0
            THEN NULL
          ELSE SUM(stats.shot_attempts_for) /
            SUM(stats.shot_attempts_for + stats.shot_attempts_against)
        END AS corsi_percentage,
        CASE
          WHEN SUM(stats.ice_time_seconds) = 0 THEN NULL
          ELSE SUM(stats.fenwick_percentage * stats.ice_time_seconds) /
            SUM(stats.ice_time_seconds)
        END AS fenwick_percentage,
        CASE WHEN COUNT(*) = COUNT(stats.high_danger_x_goals_for) THEN SUM(stats.high_danger_x_goals_for) END AS high_danger_x_goals_for,
        CASE WHEN COUNT(*) = COUNT(stats.high_danger_x_goals_against) THEN SUM(stats.high_danger_x_goals_against) END AS high_danger_x_goals_against,
        SUM(stats.x_goals_for) AS x_goals_for,
        SUM(stats.x_goals_against) AS x_goals_against,
        SUM(stats.goals_for) AS goals_for,
        SUM(stats.goals_against) AS goals_against,
        CASE WHEN COUNT(*) = COUNT(stats.shots_on_goal_for)
          AND COUNT(*) = COUNT(stats.shots_on_goal_against)
          AND COUNT(*) = COUNT(stats.goals_for) AND COUNT(*) = COUNT(stats.goals_against)
        THEN 100 * (SUM(stats.goals_for) / NULLIF(SUM(stats.shots_on_goal_for), 0)
          + 1 - SUM(stats.goals_against) / NULLIF(SUM(stats.shots_on_goal_against), 0)) END AS pdo
      FROM moneypuck_team_game_stats AS stats
      JOIN games AS game
        ON game.id = stats.game_id
      JOIN teams AS team
        ON team.id = stats.team_id
      LEFT JOIN team_seasons AS team_season
        ON team_season.team_id = team.id
       AND team_season.season_id = game.season_id
      WHERE game.season_id = $1
        AND stats.situation = $2
        AND game.game_type = $3
      GROUP BY
        team.id,
        team.nhl_id,
        team.franchise_id,
        team_season.abbreviation,
        team.abbreviation,
        team_season.full_name,
        team.name,
        stats.situation
      ORDER BY x_goals_percentage DESC NULLS LAST, team_name
    `,
    gameType === 2
      ? [seasonId, situation]
      : [seasonId, situation, gameType],
  );

  return rows.map((row) => ({
    team: mapTeam(row),
    situation: row.situation,
    gamesPlayed: row.games_played,
    iceTimeSeconds: row.ice_time_seconds,
    highDangerExpectedGoalsFor: row.high_danger_x_goals_for ?? null,
    highDangerExpectedGoalsAgainst: row.high_danger_x_goals_against ?? null,
    highDangerExpectedGoalsPercentage: row.high_danger_x_goals_for != null && row.high_danger_x_goals_against != null && row.high_danger_x_goals_for + row.high_danger_x_goals_against > 0
      ? row.high_danger_x_goals_for / (row.high_danger_x_goals_for + row.high_danger_x_goals_against) : null,
    expectedGoalsPercentage: row.x_goals_percentage,
    corsiPercentage: row.corsi_percentage,
    fenwickPercentage: row.fenwick_percentage,
    expectedGoalsFor: row.x_goals_for,
    expectedGoalsAgainst: row.x_goals_against,
    pdo: row.pdo ?? null,
    goalsFor: row.goals_for,
    goalsAgainst: row.goals_against,
  }));
}

export async function listAdvancedSkaterLeaders(
  seasonId: number,
  situation: string,
  minimumIceTimeSeconds: number,
  limit = 200,
  filters: { query?: string; position?: string } = {},
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
        stats.individual_points,
        stats.on_ice_x_goals_for,
        stats.on_ice_x_goals_against,
        (stats.metrics->>'OnIce_F_highDangerxGoals')::double precision AS hd_for,
        (stats.metrics->>'OnIce_A_highDangerxGoals')::double precision AS hd_against
      FROM moneypuck_skater_season_stats AS stats
      JOIN players AS player
        ON player.id = stats.player_id
      ${seasonIdentityJoin}
      WHERE stats.season_id = $1
        AND stats.situation = $2
        AND stats.ice_time_seconds >= $3
        AND ($5 = '' OR strpos(lower(player.display_name), lower($5)) > 0)
        AND ($6 = '' OR ($6 = 'F' AND COALESCE(stats.position, player.position) IN ('C', 'L', 'R', 'LW', 'RW', 'F'))
          OR COALESCE(stats.position, player.position) = $6
          OR ($6 = 'L' AND COALESCE(stats.position, player.position) = 'LW')
          OR ($6 = 'R' AND COALESCE(stats.position, player.position) = 'RW'))
      ORDER BY stats.individual_points * 3600.0 / NULLIF(stats.ice_time_seconds, 0) DESC NULLS LAST, player_name, team_name
      LIMIT $4
    `,
    [seasonId, situation, minimumIceTimeSeconds, Math.min(200, Math.max(1, limit)), filters.query ?? "", filters.position ?? ""],
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
    pointsPer60: perSixty(row.individual_points, row.ice_time_seconds),
    individualExpectedGoalsPer60: perSixty(row.individual_x_goals, row.ice_time_seconds),
    onIceExpectedGoalsForPer60: perSixty(row.on_ice_x_goals_for, row.ice_time_seconds),
    onIceExpectedGoalsAgainstPer60: perSixty(row.on_ice_x_goals_against, row.ice_time_seconds),
    onIceHighDangerExpectedGoalsPercentage: row.hd_for != null && row.hd_against != null && row.hd_for + row.hd_against > 0
      ? row.hd_for / (row.hd_for + row.hd_against) : null,
  }));
}

export async function listAdvancedGoalieLeaders(
  seasonId: number,
  situation: string,
  minimumIceTimeSeconds: number,
  limit = 200,
  filters: { query?: string; position?: string } = {},
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
        (stats.metrics->>'highDangerxGoals')::double precision - (stats.metrics->>'highDangerGoals')::double precision AS hd_saved,
        (stats.metrics->>'mediumDangerxGoals')::double precision - (stats.metrics->>'mediumDangerGoals')::double precision AS md_saved,
        (stats.metrics->>'lowDangerxGoals')::double precision - (stats.metrics->>'lowDangerGoals')::double precision AS ld_saved,
        (stats.metrics->>'rebounds')::double precision AS rebounds,
        stats.expected_shots_on_goal_against,
        stats.shots_on_goal_against
      FROM moneypuck_goalie_season_stats AS stats
      JOIN players AS player
        ON player.id = stats.player_id
      ${seasonIdentityJoin}
      WHERE stats.season_id = $1
        AND stats.situation = $2
        AND stats.ice_time_seconds >= $3
        AND ($5 = '' OR strpos(lower(player.display_name), lower($5)) > 0)
      ORDER BY (stats.expected_goals_against - stats.goals_against) * 3600.0 / NULLIF(stats.ice_time_seconds, 0) DESC NULLS LAST,
               player_name, team_name
      LIMIT $4
    `,
    [seasonId, situation, minimumIceTimeSeconds, Math.min(200, Math.max(1, limit)), filters.query ?? ""],
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
    expectedGoalsAgainstPer60: perSixty(row.expected_goals_against, row.ice_time_seconds),
    highDangerGoalsSavedAboveExpected: row.hd_saved,
    mediumDangerGoalsSavedAboveExpected: row.md_saved,
    lowDangerGoalsSavedAboveExpected: row.ld_saved,
    reboundsPer60: perSixty(row.rebounds, row.ice_time_seconds),
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
