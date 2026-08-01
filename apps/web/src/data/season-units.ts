import "server-only";

import type {
  MoneyPuckSeasonUnitLeaders,
  MoneyPuckSeasonUnitPlayer,
  MoneyPuckSeasonUnitStats,
  MoneyPuckSeasonUnitType,
  MoneyPuckUnitDetail,
  MoneyPuckUnitGameStats,
} from "@/contracts/season-unit";
import type { TeamIdentity } from "@/contracts/team";
import { query } from "@/data/database";

type SeasonUnitRow = {
  season_id: number;
  unit_key: string;
  team_id: number;
  nhl_team_id: number;
  franchise_id: number | null;
  abbreviation: string;
  team_name: string;
  unit_type: string;
  player_1_nhl_id: number;
  player_1_name: string;
  player_2_nhl_id: number;
  player_2_name: string;
  player_3_nhl_id: number | null;
  player_3_name: string | null;
  games_played: number;
  ice_time_seconds: number;
  x_goals_percentage: number | null;
  corsi_percentage: number | null;
  x_goals_for: number | null;
  x_goals_against: number | null;
  goals_for: number | null;
  goals_against: number | null;
  shots_on_goal_for: number | null;
  shots_on_goal_against: number | null;
  high_danger_x_goals_for: number | null;
  high_danger_x_goals_against: number | null;
};

type SeasonUnitOptions = {
  teamNhlId?: number;
  minimumIceTimeSeconds?: number;
  limit?: number;
  rollingGames?: 10 | 20 | 40;
};

type UnitIdentityRow = Pick<
  SeasonUnitRow,
  | "team_id"
  | "nhl_team_id"
  | "franchise_id"
  | "abbreviation"
  | "team_name"
  | "player_1_nhl_id"
  | "player_1_name"
  | "player_2_nhl_id"
  | "player_2_name"
  | "player_3_nhl_id"
  | "player_3_name"
>;

type UnitGameRow = {
  season_id: number;
  unit_key: string;
  unit_type: string;
  team_id: number;
  nhl_team_id: number;
  franchise_id: number | null;
  abbreviation: string;
  team_name: string;
  player_1_nhl_id: number;
  player_1_name: string;
  player_2_nhl_id: number;
  player_2_name: string;
  player_3_nhl_id: number | null;
  player_3_name: string | null;
  nhl_game_id: number;
  game_date: string;
  is_home: boolean;
  opponent_team_id: number;
  opponent_nhl_team_id: number;
  opponent_franchise_id: number | null;
  opponent_abbreviation: string;
  opponent_name: string;
  team_score: number | null;
  opponent_score: number | null;
  ice_time_seconds: number;
  x_goals_percentage: number | null;
  corsi_percentage: number | null;
  x_goals_for: number | null;
  x_goals_against: number | null;
  goals_for: number | null;
  goals_against: number | null;
  shots_on_goal_for: number | null;
  shots_on_goal_against: number | null;
};

export async function getMoneyPuckSeasonUnitLeaders(
  seasonId: number,
  options: SeasonUnitOptions = {},
): Promise<MoneyPuckSeasonUnitLeaders> {
  const [forwardLines, defensivePairings] = await Promise.all([
    listMoneyPuckSeasonUnits(seasonId, "line", options),
    listMoneyPuckSeasonUnits(seasonId, "pairing", options),
  ]);
  return { forwardLines, defensivePairings };
}

export async function listMoneyPuckSeasonUnits(
  seasonId: number,
  unitType: MoneyPuckSeasonUnitType,
  {
    teamNhlId,
    minimumIceTimeSeconds = 6_000,
    limit = 100,
    rollingGames,
  }: SeasonUnitOptions = {},
): Promise<MoneyPuckSeasonUnitStats[]> {
  if (rollingGames !== undefined) {
    return listRollingMoneyPuckSeasonUnits(seasonId, unitType, {
      teamNhlId,
      minimumIceTimeSeconds,
      limit,
      rollingGames,
    });
  }
  const rows = await query<SeasonUnitRow>(
    `
      SELECT
        stats.season_id,
        stats.unit_key,
        team.id AS team_id,
        team.nhl_id AS nhl_team_id,
        team.franchise_id,
        COALESCE(team_season.abbreviation, team.abbreviation) AS abbreviation,
        COALESCE(team_season.full_name, team.name) AS team_name,
        stats.unit_type,
        player_1.nhl_id::integer AS player_1_nhl_id,
        player_1.display_name AS player_1_name,
        player_2.nhl_id::integer AS player_2_nhl_id,
        player_2.display_name AS player_2_name,
        player_3.nhl_id::integer AS player_3_nhl_id,
        player_3.display_name AS player_3_name,
        stats.games_played,
        stats.ice_time_seconds,
        stats.x_goals_percentage,
        stats.corsi_percentage,
        stats.x_goals_for,
        stats.x_goals_against,
        stats.goals_for,
        stats.goals_against,
        stats.shots_on_goal_for,
        stats.shots_on_goal_against,
        stats.high_danger_x_goals_for,
        stats.high_danger_x_goals_against
      FROM moneypuck_unit_season_stats AS stats
      JOIN teams AS team
        ON team.id = stats.team_id
      LEFT JOIN team_seasons AS team_season
        ON team_season.team_id = team.id
       AND team_season.season_id = stats.season_id
      JOIN players AS player_1
        ON player_1.id = stats.player_1_id
      JOIN players AS player_2
        ON player_2.id = stats.player_2_id
      LEFT JOIN players AS player_3
        ON player_3.id = stats.player_3_id
      WHERE stats.season_id = $1
        AND stats.unit_type = $2
        AND stats.ice_time_seconds >= $3
        AND ($4::integer IS NULL OR team.nhl_id = $4)
      ORDER BY stats.x_goals_percentage DESC NULLS LAST,
               stats.ice_time_seconds DESC
      LIMIT $5
    `,
    [
      seasonId,
      unitType,
      Math.max(0, minimumIceTimeSeconds),
      teamNhlId ?? null,
      Math.min(500, Math.max(1, limit)),
    ],
  );
  return rows.map(mapSeasonUnit);
}

async function listRollingMoneyPuckSeasonUnits(
  seasonId: number,
  unitType: MoneyPuckSeasonUnitType,
  {
    teamNhlId,
    minimumIceTimeSeconds = 0,
    limit = 100,
    rollingGames = 10,
  }: SeasonUnitOptions,
): Promise<MoneyPuckSeasonUnitStats[]> {
  const rows = await query<SeasonUnitRow>(
    `
      WITH canonical_game_units AS (
        SELECT
          game.season_id,
          stats.*,
          ARRAY(
            SELECT player_id
            FROM unnest(ARRAY[
              stats.player_1_id,
              stats.player_2_id,
              stats.player_3_id
            ]) AS player_id
            WHERE player_id IS NOT NULL
            ORDER BY player_id
          ) AS player_ids,
          DENSE_RANK() OVER (
            PARTITION BY stats.team_id
            ORDER BY stats.game_date DESC, stats.game_id DESC
          ) AS team_game_rank
        FROM moneypuck_line_game_stats AS stats
        JOIN games AS game
          ON game.id = stats.game_id
        JOIN teams AS filter_team
          ON filter_team.id = stats.team_id
        WHERE game.season_id = $1
          AND game.game_type = 2
          AND stats.unit_type = $2
          AND stats.situation = '5on5'
          AND ($4::integer IS NULL OR filter_team.nhl_id = $4)
      ),
      aggregate AS (
        SELECT
          season_id,
          team_id,
          unit_type,
          player_ids[1] AS player_1_id,
          player_ids[2] AS player_2_id,
          player_ids[3] AS player_3_id,
          array_to_string(player_ids, ':') AS unit_key,
          COUNT(DISTINCT game_id)::integer AS games_played,
          SUM(ice_time_seconds)::float AS ice_time_seconds,
          CASE
            WHEN SUM(x_goals_for + x_goals_against) > 0
              THEN SUM(x_goals_for)::float /
                SUM(x_goals_for + x_goals_against)
            ELSE NULL
          END AS x_goals_percentage,
          CASE
            WHEN SUM(shot_attempts_for + shot_attempts_against) > 0
              THEN SUM(shot_attempts_for)::float /
                SUM(shot_attempts_for + shot_attempts_against)
            ELSE NULL
          END AS corsi_percentage,
          SUM(x_goals_for)::float AS x_goals_for,
          SUM(x_goals_against)::float AS x_goals_against,
          SUM(goals_for)::float AS goals_for,
          SUM(goals_against)::float AS goals_against,
          SUM(shots_on_goal_for)::float AS shots_on_goal_for,
          SUM(shots_on_goal_against)::float AS shots_on_goal_against,
          SUM(high_danger_x_goals_for)::float AS high_danger_x_goals_for,
          SUM(high_danger_x_goals_against)::float
            AS high_danger_x_goals_against
        FROM canonical_game_units
        WHERE team_game_rank <= $6
        GROUP BY season_id, team_id, unit_type, player_ids
      )
      SELECT
        aggregate.season_id,
        aggregate.unit_key,
        team.id AS team_id,
        team.nhl_id AS nhl_team_id,
        team.franchise_id,
        COALESCE(team_season.abbreviation, team.abbreviation) AS abbreviation,
        COALESCE(team_season.full_name, team.name) AS team_name,
        aggregate.unit_type,
        player_1.nhl_id::integer AS player_1_nhl_id,
        player_1.display_name AS player_1_name,
        player_2.nhl_id::integer AS player_2_nhl_id,
        player_2.display_name AS player_2_name,
        player_3.nhl_id::integer AS player_3_nhl_id,
        player_3.display_name AS player_3_name,
        aggregate.games_played,
        aggregate.ice_time_seconds,
        aggregate.x_goals_percentage,
        aggregate.corsi_percentage,
        aggregate.x_goals_for,
        aggregate.x_goals_against,
        aggregate.goals_for,
        aggregate.goals_against,
        aggregate.shots_on_goal_for,
        aggregate.shots_on_goal_against,
        aggregate.high_danger_x_goals_for,
        aggregate.high_danger_x_goals_against
      FROM aggregate
      JOIN teams AS team
        ON team.id = aggregate.team_id
      LEFT JOIN team_seasons AS team_season
        ON team_season.team_id = team.id
       AND team_season.season_id = aggregate.season_id
      JOIN players AS player_1
        ON player_1.id = aggregate.player_1_id
      JOIN players AS player_2
        ON player_2.id = aggregate.player_2_id
      LEFT JOIN players AS player_3
        ON player_3.id = aggregate.player_3_id
      WHERE aggregate.ice_time_seconds >= $3
      ORDER BY aggregate.x_goals_percentage DESC NULLS LAST,
               aggregate.ice_time_seconds DESC
      LIMIT $5
    `,
    [
      seasonId,
      unitType,
      Math.max(0, minimumIceTimeSeconds),
      teamNhlId ?? null,
      Math.min(500, Math.max(1, limit)),
      rollingGames,
    ],
  );
  return rows.map(mapSeasonUnit);
}

export async function getMoneyPuckUnitDetail(
  seasonId: number,
  teamNhlId: number,
  unitType: MoneyPuckSeasonUnitType,
  playerNhlIds: number[],
): Promise<MoneyPuckUnitDetail | null> {
  const expectedPlayers = unitType === "line" ? 3 : 2;
  const canonicalPlayerIds = [...new Set(playerNhlIds)].sort(
    (left, right) => left - right,
  );
  if (canonicalPlayerIds.length !== expectedPlayers) {
    return null;
  }
  const rows = await query<UnitGameRow>(
    `
      WITH matching_units AS (
        SELECT
          stats.*,
          game.season_id,
          game.nhl_id::integer AS nhl_game_id,
          ARRAY(
            SELECT player.id
            FROM unnest(ARRAY[
              stats.player_1_id,
              stats.player_2_id,
              stats.player_3_id
            ]) AS player(id)
            WHERE player.id IS NOT NULL
            ORDER BY player.id
          ) AS player_ids
        FROM moneypuck_line_game_stats AS stats
        JOIN games AS game
          ON game.id = stats.game_id
        JOIN teams AS filter_team
          ON filter_team.id = stats.team_id
        WHERE game.season_id = $1
          AND game.game_type = 2
          AND filter_team.nhl_id = $2
          AND stats.unit_type = $3
          AND stats.situation = '5on5'
      )
      SELECT
        matching.season_id,
        array_to_string(matching.player_ids, ':') AS unit_key,
        matching.unit_type,
        team.id AS team_id,
        team.nhl_id AS nhl_team_id,
        team.franchise_id,
        COALESCE(team_season.abbreviation, team.abbreviation) AS abbreviation,
        COALESCE(team_season.full_name, team.name) AS team_name,
        player_1.nhl_id::integer AS player_1_nhl_id,
        player_1.display_name AS player_1_name,
        player_2.nhl_id::integer AS player_2_nhl_id,
        player_2.display_name AS player_2_name,
        player_3.nhl_id::integer AS player_3_nhl_id,
        player_3.display_name AS player_3_name,
        matching.nhl_game_id,
        matching.game_date::text AS game_date,
        matching.is_home,
        opponent.id AS opponent_team_id,
        opponent.nhl_id AS opponent_nhl_team_id,
        opponent.franchise_id AS opponent_franchise_id,
        COALESCE(opponent_season.abbreviation, opponent.abbreviation)
          AS opponent_abbreviation,
        COALESCE(opponent_season.full_name, opponent.name) AS opponent_name,
        team_stats.score AS team_score,
        opponent_stats.score AS opponent_score,
        matching.ice_time_seconds,
        matching.x_goals_percentage,
        matching.corsi_percentage,
        matching.x_goals_for,
        matching.x_goals_against,
        matching.goals_for,
        matching.goals_against,
        matching.shots_on_goal_for,
        matching.shots_on_goal_against
      FROM matching_units AS matching
      JOIN teams AS team
        ON team.id = matching.team_id
      JOIN teams AS opponent
        ON opponent.id = matching.opponent_team_id
      LEFT JOIN team_seasons AS team_season
        ON team_season.team_id = team.id
       AND team_season.season_id = matching.season_id
      LEFT JOIN team_seasons AS opponent_season
        ON opponent_season.team_id = opponent.id
       AND opponent_season.season_id = matching.season_id
      JOIN players AS player_1
        ON player_1.id = matching.player_ids[1]
      JOIN players AS player_2
        ON player_2.id = matching.player_ids[2]
      LEFT JOIN players AS player_3
        ON player_3.id = matching.player_ids[3]
      LEFT JOIN team_game_stats AS team_stats
        ON team_stats.game_id = matching.game_id
       AND team_stats.team_id = matching.team_id
      LEFT JOIN team_game_stats AS opponent_stats
        ON opponent_stats.game_id = matching.game_id
       AND opponent_stats.team_id = matching.opponent_team_id
      WHERE matching.player_ids = ARRAY(
        SELECT player.id
        FROM players AS player
        WHERE player.nhl_id = ANY($4::bigint[])
        ORDER BY player.id
      )
      ORDER BY matching.game_date DESC, matching.game_id DESC
    `,
    [seasonId, teamNhlId, unitType, canonicalPlayerIds],
  );
  const first = rows[0];
  if (!first) {
    return null;
  }
  return {
    seasonId: first.season_id,
    unitKey: first.unit_key,
    unitType: parseUnitType(first.unit_type),
    team: mapTeam(first),
    players: mapPlayers(first),
    games: rows.map(mapUnitGame),
  };
}

function mapSeasonUnit(row: SeasonUnitRow): MoneyPuckSeasonUnitStats {
  return {
    seasonId: row.season_id,
    unitKey: row.unit_key,
    team: mapTeam(row),
    players: mapPlayers(row),
    unitType: parseUnitType(row.unit_type),
    gamesPlayed: row.games_played,
    iceTimeSeconds: row.ice_time_seconds,
    expectedGoalsPercentage: row.x_goals_percentage,
    corsiPercentage: row.corsi_percentage,
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

function mapUnitGame(row: UnitGameRow): MoneyPuckUnitGameStats {
  return {
    nhlGameId: row.nhl_game_id,
    gameDate: row.game_date,
    isHome: row.is_home,
    opponent: {
      id: row.opponent_team_id,
      nhlTeamId: row.opponent_nhl_team_id,
      franchiseId: row.opponent_franchise_id,
      abbreviation: row.opponent_abbreviation,
      name: row.opponent_name,
    },
    teamScore: row.team_score,
    opponentScore: row.opponent_score,
    iceTimeSeconds: row.ice_time_seconds,
    expectedGoalsPercentage: row.x_goals_percentage,
    corsiPercentage: row.corsi_percentage,
    expectedGoalsFor: row.x_goals_for,
    expectedGoalsAgainst: row.x_goals_against,
    goalsFor: row.goals_for,
    goalsAgainst: row.goals_against,
    shotsOnGoalFor: row.shots_on_goal_for,
    shotsOnGoalAgainst: row.shots_on_goal_against,
  };
}

function mapTeam(row: UnitIdentityRow): TeamIdentity {
  return {
    id: row.team_id,
    nhlTeamId: row.nhl_team_id,
    franchiseId: row.franchise_id,
    abbreviation: row.abbreviation,
    name: row.team_name,
  };
}

function mapPlayers(row: UnitIdentityRow): MoneyPuckSeasonUnitPlayer[] {
  const players = [
    { nhlPlayerId: row.player_1_nhl_id, name: row.player_1_name },
    { nhlPlayerId: row.player_2_nhl_id, name: row.player_2_name },
  ];
  if (row.player_3_nhl_id !== null && row.player_3_name !== null) {
    players.push({
      nhlPlayerId: row.player_3_nhl_id,
      name: row.player_3_name,
    });
  }
  return players;
}

function parseUnitType(value: string): MoneyPuckSeasonUnitType {
  if (value === "line" || value === "pairing") {
    return value;
  }
  throw new Error(`Unknown MoneyPuck season unit type: ${value}`);
}
