import "server-only";

import type {
  MoneyPuckGameAnalytics,
  MoneyPuckGameContext,
  MoneyPuckGamePlayer,
  MoneyPuckGameTeam,
  MoneyPuckGameUnit,
  MoneyPuckGoalieGameSituation,
  MoneyPuckShot,
  MoneyPuckSkaterGameSituation,
  MoneyPuckTeamGameSituation,
  MoneyPuckUnitType,
} from "@/contracts/advanced-game";
import { query } from "@/data/database";

type TeamFields = {
  team_nhl_id: number;
  team_abbreviation: string;
  team_name: string;
  opponent_nhl_id: number;
  opponent_abbreviation: string;
  opponent_name: string;
};

type GameContextRow = {
  nhl_game_id: number;
  season_id: number;
  game_type: number;
  game_date: string;
  away_nhl_team_id: number;
  away_abbreviation: string;
  away_name: string;
  home_nhl_team_id: number;
  home_abbreviation: string;
  home_name: string;
};

type TeamSituationRow = TeamFields & {
  situation: string;
  is_home: boolean;
  playoff_game: boolean;
  ice_time_seconds: number;
  x_goals_percentage: number | null;
  corsi_percentage: number | null;
  fenwick_percentage: number | null;
  x_goals_for: number | null;
  x_goals_against: number | null;
  goals_for: number | null;
  goals_against: number | null;
  shots_on_goal_for: number | null;
  shots_on_goal_against: number | null;
  shot_attempts_for: number | null;
  shot_attempts_against: number | null;
  high_danger_x_goals_for: number | null;
  high_danger_x_goals_against: number | null;
};

type PlayerSituationRow = TeamFields & {
  nhl_player_id: number;
  player_name: string;
  situation: string;
  is_home: boolean;
  ice_time_seconds: number;
};

type SkaterSituationRow = PlayerSituationRow & {
  position: string | null;
  shifts: number | null;
  game_score: number | null;
  on_ice_x_goals_percentage: number | null;
  on_ice_corsi_percentage: number | null;
  on_ice_fenwick_percentage: number | null;
  individual_x_goals: number | null;
  individual_goals: number | null;
  individual_points: number | null;
  individual_shot_attempts: number | null;
  primary_assists: number | null;
  secondary_assists: number | null;
  shots_on_goal: number | null;
  hits: number | null;
  takeaways: number | null;
  giveaways: number | null;
  on_ice_x_goals_for: number | null;
  on_ice_x_goals_against: number | null;
};

type GoalieSituationRow = PlayerSituationRow & {
  expected_goals_against: number | null;
  goals_against: number | null;
  shots_on_goal_against: number | null;
  expected_shots_on_goal_against: number | null;
  expected_rebounds: number | null;
  rebounds: number | null;
  expected_freezes: number | null;
  freezes: number | null;
  low_danger_x_goals_against: number | null;
  medium_danger_x_goals_against: number | null;
  high_danger_x_goals_against: number | null;
};

type ShotRow = TeamFields & {
  source_shot_id: string;
  source_event_index: number;
  shooter_nhl_id: number | null;
  shooter_name: string | null;
  goalie_nhl_id: number | null;
  goalie_name: string | null;
  event_type: string;
  period: number;
  time_in_period_seconds: number;
  is_home_team: boolean;
  is_playoff_game: boolean;
  is_goal: boolean;
  was_on_goal: boolean;
  shot_type: string | null;
  location: string | null;
  x_coord: number | null;
  y_coord: number | null;
  x_coord_adjusted: number | null;
  y_coord_adjusted: number | null;
  shot_distance: number | null;
  shot_angle: number | null;
  x_goal: number | null;
  x_rebound: number | null;
  generated_rebound: boolean;
  was_rebound: boolean;
  was_rush: boolean;
  was_off_wing: boolean;
  was_empty_net: boolean;
  home_skaters_on_ice: number | null;
  away_skaters_on_ice: number | null;
  home_team_goals: number | null;
  away_team_goals: number | null;
  time_since_last_event: number | null;
  distance_from_last_event: number | null;
};

type UnitRow = TeamFields & {
  source_line_id: string;
  name: string;
  unit_type: string;
  player_1_nhl_id: number;
  player_1_name: string;
  player_2_nhl_id: number;
  player_2_name: string;
  player_3_nhl_id: number | null;
  player_3_name: string | null;
  situation: string;
  is_home: boolean;
  ice_time_seconds: number;
  ice_time_rank: number | null;
  x_goals_percentage: number | null;
  corsi_percentage: number | null;
  fenwick_percentage: number | null;
  x_goals_for: number | null;
  x_goals_against: number | null;
  goals_for: number | null;
  goals_against: number | null;
  shots_on_goal_for: number | null;
  shots_on_goal_against: number | null;
  high_danger_x_goals_for: number | null;
  high_danger_x_goals_against: number | null;
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

const teamIdentitySelect = `
  team.nhl_id::integer AS team_nhl_id,
  COALESCE(team_season.abbreviation, team.abbreviation) AS team_abbreviation,
  COALESCE(team_season.full_name, team.name) AS team_name,
  opponent.nhl_id::integer AS opponent_nhl_id,
  COALESCE(opponent_season.abbreviation, opponent.abbreviation)
    AS opponent_abbreviation,
  COALESCE(opponent_season.full_name, opponent.name) AS opponent_name
`;

const teamIdentityJoins = `
  JOIN teams AS team
    ON team.id = stats.team_id
  JOIN teams AS opponent
    ON opponent.id = stats.opponent_team_id
  LEFT JOIN team_seasons AS team_season
    ON team_season.team_id = team.id
   AND team_season.season_id = game.season_id
  LEFT JOIN team_seasons AS opponent_season
    ON opponent_season.team_id = opponent.id
   AND opponent_season.season_id = game.season_id
`;

export async function getMoneyPuckGameAnalytics(
  nhlGameId: number,
): Promise<MoneyPuckGameAnalytics | null> {
  const [
    gameRows,
    teamRows,
    skaterRows,
    goalieRows,
    shotRows,
    unitRows,
  ] = await Promise.all([
    query<GameContextRow>(
      `
        SELECT
          game.nhl_id::integer AS nhl_game_id,
          game.season_id,
          game.game_type,
          game.game_date::text AS game_date,
          away_team.nhl_id::integer AS away_nhl_team_id,
          COALESCE(away_season.abbreviation, away_team.abbreviation)
            AS away_abbreviation,
          COALESCE(away_season.full_name, away_team.name) AS away_name,
          home_team.nhl_id::integer AS home_nhl_team_id,
          COALESCE(home_season.abbreviation, home_team.abbreviation)
            AS home_abbreviation,
          COALESCE(home_season.full_name, home_team.name) AS home_name
        FROM games AS game
        JOIN teams AS away_team
          ON away_team.id = game.away_team_id
        JOIN teams AS home_team
          ON home_team.id = game.home_team_id
        LEFT JOIN team_seasons AS away_season
          ON away_season.team_id = away_team.id
         AND away_season.season_id = game.season_id
        LEFT JOIN team_seasons AS home_season
          ON home_season.team_id = home_team.id
         AND home_season.season_id = game.season_id
        WHERE game.nhl_id = $1
      `,
      [nhlGameId],
    ),
    query<TeamSituationRow>(
      `
        SELECT
          ${teamIdentitySelect},
          stats.situation,
          stats.is_home,
          stats.playoff_game,
          stats.ice_time_seconds,
          stats.x_goals_percentage,
          stats.corsi_percentage,
          stats.fenwick_percentage,
          stats.x_goals_for,
          stats.x_goals_against,
          stats.goals_for,
          stats.goals_against,
          stats.shots_on_goal_for,
          stats.shots_on_goal_against,
          stats.shot_attempts_for,
          stats.shot_attempts_against,
          stats.high_danger_x_goals_for,
          stats.high_danger_x_goals_against
        FROM moneypuck_team_game_stats AS stats
        JOIN games AS game
          ON game.id = stats.game_id
        ${teamIdentityJoins}
        WHERE game.nhl_id = $1
        ORDER BY stats.is_home, ${situationOrder}
      `,
      [nhlGameId],
    ),
    query<SkaterSituationRow>(
      `
        SELECT
          ${teamIdentitySelect},
          player.nhl_id::integer AS nhl_player_id,
          player.display_name AS player_name,
          stats.position,
          stats.situation,
          stats.is_home,
          stats.ice_time_seconds,
          stats.shifts,
          stats.game_score,
          stats.on_ice_x_goals_percentage,
          stats.on_ice_corsi_percentage,
          stats.on_ice_fenwick_percentage,
          stats.individual_x_goals,
          stats.individual_goals,
          stats.individual_points,
          stats.individual_shot_attempts,
          stats.primary_assists,
          stats.secondary_assists,
          stats.shots_on_goal,
          stats.hits,
          stats.takeaways,
          stats.giveaways,
          stats.on_ice_x_goals_for,
          stats.on_ice_x_goals_against
        FROM moneypuck_skater_game_stats AS stats
        JOIN games AS game
          ON game.id = stats.game_id
        JOIN players AS player
          ON player.id = stats.player_id
        ${teamIdentityJoins}
        WHERE game.nhl_id = $1
        ORDER BY stats.is_home, player.display_name, ${situationOrder}
      `,
      [nhlGameId],
    ),
    query<GoalieSituationRow>(
      `
        SELECT
          ${teamIdentitySelect},
          player.nhl_id::integer AS nhl_player_id,
          player.display_name AS player_name,
          stats.situation,
          stats.is_home,
          stats.ice_time_seconds,
          stats.expected_goals_against,
          stats.goals_against,
          stats.shots_on_goal_against,
          stats.expected_shots_on_goal_against,
          stats.expected_rebounds,
          stats.rebounds,
          stats.expected_freezes,
          stats.freezes,
          stats.low_danger_x_goals_against,
          stats.medium_danger_x_goals_against,
          stats.high_danger_x_goals_against
        FROM moneypuck_goalie_game_stats AS stats
        JOIN games AS game
          ON game.id = stats.game_id
        JOIN players AS player
          ON player.id = stats.player_id
        ${teamIdentityJoins}
        WHERE game.nhl_id = $1
        ORDER BY stats.is_home, player.display_name, ${situationOrder}
      `,
      [nhlGameId],
    ),
    query<ShotRow>(
      `
        SELECT
          shooting_team.nhl_id::integer AS team_nhl_id,
          COALESCE(shooting_season.abbreviation, shooting_team.abbreviation)
            AS team_abbreviation,
          COALESCE(shooting_season.full_name, shooting_team.name) AS team_name,
          defending_team.nhl_id::integer AS opponent_nhl_id,
          COALESCE(defending_season.abbreviation, defending_team.abbreviation)
            AS opponent_abbreviation,
          COALESCE(defending_season.full_name, defending_team.name)
            AS opponent_name,
          stats.source_shot_id::text AS source_shot_id,
          stats.source_event_index,
          shooter.nhl_id::integer AS shooter_nhl_id,
          shooter.display_name AS shooter_name,
          goalie.nhl_id::integer AS goalie_nhl_id,
          goalie.display_name AS goalie_name,
          stats.event_type,
          stats.period,
          stats.time_in_period_seconds,
          stats.is_home_team,
          stats.is_playoff_game,
          stats.is_goal,
          stats.was_on_goal,
          stats.shot_type,
          stats.location,
          stats.x_coord,
          stats.y_coord,
          stats.x_coord_adjusted,
          stats.y_coord_adjusted,
          stats.shot_distance,
          stats.shot_angle,
          stats.x_goal,
          stats.x_rebound,
          stats.generated_rebound,
          stats.was_rebound,
          stats.was_rush,
          stats.was_off_wing,
          stats.was_empty_net,
          stats.home_skaters_on_ice,
          stats.away_skaters_on_ice,
          stats.home_team_goals,
          stats.away_team_goals,
          stats.time_since_last_event,
          stats.distance_from_last_event
        FROM moneypuck_shots AS stats
        JOIN games AS game
          ON game.id = stats.game_id
        JOIN teams AS shooting_team
          ON shooting_team.id = stats.shooting_team_id
        JOIN teams AS defending_team
          ON defending_team.id = stats.defending_team_id
        LEFT JOIN players AS shooter
          ON shooter.id = stats.shooter_player_id
        LEFT JOIN players AS goalie
          ON goalie.id = stats.goalie_player_id
        LEFT JOIN team_seasons AS shooting_season
          ON shooting_season.team_id = shooting_team.id
         AND shooting_season.season_id = game.season_id
        LEFT JOIN team_seasons AS defending_season
          ON defending_season.team_id = defending_team.id
         AND defending_season.season_id = game.season_id
        WHERE game.nhl_id = $1
        ORDER BY stats.period, stats.source_event_index
      `,
      [nhlGameId],
    ),
    query<UnitRow>(
      `
        SELECT
          ${teamIdentitySelect},
          stats.source_line_id,
          stats.name,
          stats.unit_type,
          player_1.nhl_id::integer AS player_1_nhl_id,
          player_1.display_name AS player_1_name,
          player_2.nhl_id::integer AS player_2_nhl_id,
          player_2.display_name AS player_2_name,
          player_3.nhl_id::integer AS player_3_nhl_id,
          player_3.display_name AS player_3_name,
          stats.situation,
          stats.is_home,
          stats.ice_time_seconds,
          stats.ice_time_rank,
          stats.x_goals_percentage,
          stats.corsi_percentage,
          stats.fenwick_percentage,
          stats.x_goals_for,
          stats.x_goals_against,
          stats.goals_for,
          stats.goals_against,
          stats.shots_on_goal_for,
          stats.shots_on_goal_against,
          stats.high_danger_x_goals_for,
          stats.high_danger_x_goals_against
        FROM moneypuck_line_game_stats AS stats
        JOIN games AS game
          ON game.id = stats.game_id
        JOIN players AS player_1
          ON player_1.id = stats.player_1_id
        JOIN players AS player_2
          ON player_2.id = stats.player_2_id
        LEFT JOIN players AS player_3
          ON player_3.id = stats.player_3_id
        ${teamIdentityJoins}
        WHERE game.nhl_id = $1
        ORDER BY stats.is_home, stats.unit_type, stats.ice_time_seconds DESC
      `,
      [nhlGameId],
    ),
  ]);

  const gameRow = gameRows[0];
  if (!gameRow) {
    return null;
  }

  const units = unitRows.map(mapUnit);
  return {
    game: mapGameContext(gameRow),
    teamSituations: teamRows.map(mapTeamSituation),
    skaterSituations: skaterRows.map(mapSkaterSituation),
    goalieSituations: goalieRows.map(mapGoalieSituation),
    shots: shotRows.map(mapShot),
    forwardLines: units.filter((unit) => unit.unitType === "line"),
    defensivePairings: units.filter((unit) => unit.unitType === "pairing"),
  };
}

function mapGameContext(row: GameContextRow): MoneyPuckGameContext {
  return {
    nhlGameId: row.nhl_game_id,
    seasonId: row.season_id,
    gameType: row.game_type,
    gameDate: row.game_date,
    awayTeam: {
      nhlTeamId: row.away_nhl_team_id,
      abbreviation: row.away_abbreviation,
      name: row.away_name,
    },
    homeTeam: {
      nhlTeamId: row.home_nhl_team_id,
      abbreviation: row.home_abbreviation,
      name: row.home_name,
    },
  };
}

function mapTeamSituation(
  row: TeamSituationRow,
): MoneyPuckTeamGameSituation {
  return {
    team: mapTeam(row),
    opponent: mapOpponent(row),
    situation: row.situation,
    isHome: row.is_home,
    playoffGame: row.playoff_game,
    iceTimeSeconds: row.ice_time_seconds,
    expectedGoalsPercentage: row.x_goals_percentage,
    corsiPercentage: row.corsi_percentage,
    fenwickPercentage: row.fenwick_percentage,
    expectedGoalsFor: row.x_goals_for,
    expectedGoalsAgainst: row.x_goals_against,
    goalsFor: row.goals_for,
    goalsAgainst: row.goals_against,
    shotsOnGoalFor: row.shots_on_goal_for,
    shotsOnGoalAgainst: row.shots_on_goal_against,
    shotAttemptsFor: row.shot_attempts_for,
    shotAttemptsAgainst: row.shot_attempts_against,
    highDangerExpectedGoalsFor: row.high_danger_x_goals_for,
    highDangerExpectedGoalsAgainst: row.high_danger_x_goals_against,
  };
}

function mapSkaterSituation(
  row: SkaterSituationRow,
): MoneyPuckSkaterGameSituation {
  return {
    ...mapPlayerSituation(row),
    position: row.position,
    shifts: row.shifts,
    gameScore: row.game_score,
    onIceExpectedGoalsPercentage: row.on_ice_x_goals_percentage,
    onIceCorsiPercentage: row.on_ice_corsi_percentage,
    onIceFenwickPercentage: row.on_ice_fenwick_percentage,
    individualExpectedGoals: row.individual_x_goals,
    individualGoals: row.individual_goals,
    individualPoints: row.individual_points,
    individualShotAttempts: row.individual_shot_attempts,
    primaryAssists: row.primary_assists,
    secondaryAssists: row.secondary_assists,
    shotsOnGoal: row.shots_on_goal,
    hits: row.hits,
    takeaways: row.takeaways,
    giveaways: row.giveaways,
    onIceExpectedGoalsFor: row.on_ice_x_goals_for,
    onIceExpectedGoalsAgainst: row.on_ice_x_goals_against,
  };
}

function mapGoalieSituation(
  row: GoalieSituationRow,
): MoneyPuckGoalieGameSituation {
  return {
    ...mapPlayerSituation(row),
    expectedGoalsAgainst: row.expected_goals_against,
    goalsAgainst: row.goals_against,
    shotsOnGoalAgainst: row.shots_on_goal_against,
    expectedShotsOnGoalAgainst: row.expected_shots_on_goal_against,
    expectedRebounds: row.expected_rebounds,
    rebounds: row.rebounds,
    expectedFreezes: row.expected_freezes,
    freezes: row.freezes,
    lowDangerExpectedGoalsAgainst: row.low_danger_x_goals_against,
    mediumDangerExpectedGoalsAgainst: row.medium_danger_x_goals_against,
    highDangerExpectedGoalsAgainst: row.high_danger_x_goals_against,
  };
}

function mapPlayerSituation(row: PlayerSituationRow) {
  return {
    player: mapPlayer(row.nhl_player_id, row.player_name),
    team: mapTeam(row),
    opponent: mapOpponent(row),
    situation: row.situation,
    isHome: row.is_home,
    iceTimeSeconds: row.ice_time_seconds,
  };
}

function mapShot(row: ShotRow): MoneyPuckShot {
  return {
    sourceShotId: row.source_shot_id,
    sourceEventIndex: row.source_event_index,
    shootingTeam: mapTeam(row),
    defendingTeam: mapOpponent(row),
    shooter: mapNullablePlayer(row.shooter_nhl_id, row.shooter_name),
    goalie: mapNullablePlayer(row.goalie_nhl_id, row.goalie_name),
    eventType: row.event_type,
    period: row.period,
    gameTimeSeconds: row.time_in_period_seconds,
    isHomeTeam: row.is_home_team,
    isPlayoffGame: row.is_playoff_game,
    isGoal: row.is_goal,
    wasOnGoal: row.was_on_goal,
    shotType: row.shot_type,
    location: row.location,
    xCoordinate: row.x_coord,
    yCoordinate: row.y_coord,
    adjustedXCoordinate: row.x_coord_adjusted,
    adjustedYCoordinate: row.y_coord_adjusted,
    shotDistance: row.shot_distance,
    shotAngle: row.shot_angle,
    expectedGoal: row.x_goal,
    expectedRebound: row.x_rebound,
    generatedRebound: row.generated_rebound,
    wasRebound: row.was_rebound,
    wasRush: row.was_rush,
    wasOffWing: row.was_off_wing,
    wasEmptyNet: row.was_empty_net,
    homeSkatersOnIce: row.home_skaters_on_ice,
    awaySkatersOnIce: row.away_skaters_on_ice,
    homeTeamGoals: row.home_team_goals,
    awayTeamGoals: row.away_team_goals,
    timeSinceLastEvent: row.time_since_last_event,
    distanceFromLastEvent: row.distance_from_last_event,
  };
}

function mapUnit(row: UnitRow): MoneyPuckGameUnit {
  const players = [
    mapPlayer(row.player_1_nhl_id, row.player_1_name),
    mapPlayer(row.player_2_nhl_id, row.player_2_name),
  ];
  const player3 = mapNullablePlayer(
    row.player_3_nhl_id,
    row.player_3_name,
  );
  if (player3) {
    players.push(player3);
  }

  return {
    sourceLineId: row.source_line_id,
    name: row.name,
    unitType: parseUnitType(row.unit_type),
    team: mapTeam(row),
    opponent: mapOpponent(row),
    players,
    situation: row.situation,
    isHome: row.is_home,
    iceTimeSeconds: row.ice_time_seconds,
    iceTimeRank: row.ice_time_rank,
    expectedGoalsPercentage: row.x_goals_percentage,
    corsiPercentage: row.corsi_percentage,
    fenwickPercentage: row.fenwick_percentage,
    expectedGoalsFor: row.x_goals_for,
    expectedGoalsAgainst: row.x_goals_against,
    goalsFor: row.goals_for,
    goalsAgainst: row.goals_against,
    shotsOnGoalFor: row.shots_on_goal_for,
    shotsOnGoalAgainst: row.shots_on_goal_against,
    highDangerExpectedGoalsFor: row.high_danger_x_goals_for,
    highDangerExpectedGoalsAgainst: row.high_danger_x_goals_against,
  };
}

function mapTeam(row: TeamFields): MoneyPuckGameTeam {
  return {
    nhlTeamId: row.team_nhl_id,
    abbreviation: row.team_abbreviation,
    name: row.team_name,
  };
}

function mapOpponent(row: TeamFields): MoneyPuckGameTeam {
  return {
    nhlTeamId: row.opponent_nhl_id,
    abbreviation: row.opponent_abbreviation,
    name: row.opponent_name,
  };
}

function mapPlayer(
  nhlPlayerId: number,
  name: string,
): MoneyPuckGamePlayer {
  return { nhlPlayerId, name };
}

function mapNullablePlayer(
  nhlPlayerId: number | null,
  name: string | null,
): MoneyPuckGamePlayer | null {
  return nhlPlayerId === null || name === null
    ? null
    : mapPlayer(nhlPlayerId, name);
}

function parseUnitType(value: string): MoneyPuckUnitType {
  if (value !== "line" && value !== "pairing") {
    throw new Error(`Unknown MoneyPuck unit type: ${value}`);
  }
  return value;
}
