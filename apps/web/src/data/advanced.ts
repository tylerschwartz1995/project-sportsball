import "server-only";

import type {
  MoneyPuckGoalieSituation,
  MoneyPuckPlayerSeason,
  MoneyPuckSkaterSituation,
  MoneyPuckTeamSeason,
  MoneyPuckTeamSituation,
} from "@/contracts/advanced";
import type { TeamIdentity } from "@/contracts/team";
import { query } from "@/data/database";

type TeamSituationRow = {
  team_id: number;
  nhl_team_id: number;
  franchise_id: number | null;
  abbreviation: string;
  team_name: string;
  season_id: number;
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
  shot_attempts_for: number | null;
  shot_attempts_against: number | null;
};

type PlayerTeamRow = {
  nhl_team_id: number;
  abbreviation: string;
  team_name: string;
  situation: string;
  games_played: number;
  ice_time_seconds: number;
};

type SkaterSituationRow = PlayerTeamRow & {
  game_score: number | null;
  on_ice_x_goals_percentage: number | null;
  on_ice_corsi_percentage: number | null;
  on_ice_fenwick_percentage: number | null;
  individual_x_goals: number | null;
  individual_goals: number | null;
  individual_points: number | null;
  individual_shot_attempts: number | null;
};

type GoalieSituationRow = PlayerTeamRow & {
  expected_goals_against: number | null;
  goals_against: number | null;
  unblocked_shot_attempts_against: number | null;
  expected_shots_on_goal_against: number | null;
  shots_on_goal_against: number | null;
  flurry_adjusted_x_goals_against: number | null;
};

const situationOrder = `
  CASE stats.situation
    WHEN 'all' THEN 1
    WHEN '5on5' THEN 2
    WHEN '5on4' THEN 3
    WHEN '4on5' THEN 4
    ELSE 5
  END
`;

export async function getMoneyPuckTeamSeason(
  nhlTeamId: number,
  seasonId: number,
): Promise<MoneyPuckTeamSeason | null> {
  const rows = await query<TeamSituationRow>(
    `
      SELECT
        team.id AS team_id,
        team.nhl_id AS nhl_team_id,
        team.franchise_id,
        COALESCE(team_season.abbreviation, team.abbreviation) AS abbreviation,
        COALESCE(team_season.full_name, team.name) AS team_name,
        stats.season_id,
        stats.situation,
        stats.games_played,
        stats.ice_time_seconds,
        stats.x_goals_percentage,
        stats.corsi_percentage,
        stats.fenwick_percentage,
        stats.x_goals_for,
        stats.x_goals_against,
        stats.goals_for,
        stats.goals_against,
        stats.shot_attempts_for,
        stats.shot_attempts_against
      FROM moneypuck_team_season_stats AS stats
      JOIN teams AS team
        ON team.id = stats.team_id
      LEFT JOIN team_seasons AS team_season
        ON team_season.team_id = team.id
       AND team_season.season_id = stats.season_id
      WHERE team.nhl_id = $1
        AND stats.season_id = $2
      ORDER BY ${situationOrder}
    `,
    [nhlTeamId, seasonId],
  );

  const firstRow = rows[0];
  if (!firstRow) {
    return null;
  }

  return {
    seasonId,
    team: mapTeam(firstRow),
    situations: rows.map(mapTeamSituation),
  };
}

export async function getMoneyPuckPlayerSeason(
  nhlPlayerId: number,
  seasonId: number,
): Promise<MoneyPuckPlayerSeason> {
  const [skaterRows, goalieRows] = await Promise.all([
    query<SkaterSituationRow>(
      `
        SELECT
          team.nhl_id AS nhl_team_id,
          COALESCE(team_season.abbreviation, team.abbreviation) AS abbreviation,
          COALESCE(team_season.full_name, team.name) AS team_name,
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
          stats.individual_shot_attempts
        FROM moneypuck_skater_season_stats AS stats
        JOIN players AS player
          ON player.id = stats.player_id
        JOIN teams AS team
          ON team.id = stats.team_id
        LEFT JOIN team_seasons AS team_season
          ON team_season.team_id = team.id
         AND team_season.season_id = stats.season_id
        WHERE player.nhl_id = $1
          AND stats.season_id = $2
        ORDER BY team_name, ${situationOrder}
      `,
      [nhlPlayerId, seasonId],
    ),
    query<GoalieSituationRow>(
      `
        SELECT
          team.nhl_id AS nhl_team_id,
          COALESCE(team_season.abbreviation, team.abbreviation) AS abbreviation,
          COALESCE(team_season.full_name, team.name) AS team_name,
          stats.situation,
          stats.games_played,
          stats.ice_time_seconds,
          stats.expected_goals_against,
          stats.goals_against,
          stats.unblocked_shot_attempts_against,
          stats.expected_shots_on_goal_against,
          stats.shots_on_goal_against,
          stats.flurry_adjusted_x_goals_against
        FROM moneypuck_goalie_season_stats AS stats
        JOIN players AS player
          ON player.id = stats.player_id
        JOIN teams AS team
          ON team.id = stats.team_id
        LEFT JOIN team_seasons AS team_season
          ON team_season.team_id = team.id
         AND team_season.season_id = stats.season_id
        WHERE player.nhl_id = $1
          AND stats.season_id = $2
        ORDER BY team_name, ${situationOrder}
      `,
      [nhlPlayerId, seasonId],
    ),
  ]);

  return {
    seasonId,
    nhlPlayerId,
    skaterSituations: skaterRows.map(mapSkaterSituation),
    goalieSituations: goalieRows.map(mapGoalieSituation),
  };
}

function mapTeam(row: TeamSituationRow): TeamIdentity {
  return {
    id: row.team_id,
    nhlTeamId: row.nhl_team_id,
    franchiseId: row.franchise_id,
    abbreviation: row.abbreviation,
    name: row.team_name,
  };
}

function mapTeamSituation(row: TeamSituationRow): MoneyPuckTeamSituation {
  return {
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
    shotAttemptsFor: row.shot_attempts_for,
    shotAttemptsAgainst: row.shot_attempts_against,
  };
}

function mapSkaterSituation(row: SkaterSituationRow): MoneyPuckSkaterSituation {
  return {
    team: mapPlayerTeam(row),
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
    individualShotAttempts: row.individual_shot_attempts,
  };
}

function mapGoalieSituation(row: GoalieSituationRow): MoneyPuckGoalieSituation {
  return {
    team: mapPlayerTeam(row),
    situation: row.situation,
    gamesPlayed: row.games_played,
    iceTimeSeconds: row.ice_time_seconds,
    expectedGoalsAgainst: row.expected_goals_against,
    goalsAgainst: row.goals_against,
    unblockedShotAttemptsAgainst: row.unblocked_shot_attempts_against,
    expectedShotsOnGoalAgainst: row.expected_shots_on_goal_against,
    shotsOnGoalAgainst: row.shots_on_goal_against,
    flurryAdjustedExpectedGoalsAgainst:
      row.flurry_adjusted_x_goals_against,
  };
}

function mapPlayerTeam(row: PlayerTeamRow) {
  return {
    nhlTeamId: row.nhl_team_id,
    abbreviation: row.abbreviation,
    name: row.team_name,
  };
}
