import "server-only";

import type {
  GameLogTeam,
  GoalieGameLogEntry,
  PlayerGameLog,
  SkaterGameLogEntry,
  TeamGameLog,
  TeamGameLogEntry,
} from "@/contracts/game-log";
import type { PlayerProfile } from "@/contracts/player";
import type { TeamIdentity } from "@/contracts/team";
import { query } from "@/data/database";

type TeamGameLogRow = {
  team_id: number;
  nhl_team_id: number;
  franchise_id: number | null;
  abbreviation: string;
  team_name: string;
  nhl_game_id: number;
  game_date: string;
  game_type: number;
  last_period_type: string | null;
  is_home: boolean;
  opponent_nhl_team_id: number;
  opponent_abbreviation: string;
  opponent_name: string;
  score: number;
  opponent_score: number;
  shots_on_goal: number | null;
  opponent_shots_on_goal: number | null;
  x_goals_percentage: number | null;
  x_goals_for: number | null;
  x_goals_against: number | null;
};

type PlayerProfileRow = {
  id: number;
  nhl_player_id: number;
  player_name: string;
  position: string | null;
  birth_date: string | null;
  birth_city: string | null;
  birth_state_province: string | null;
  birth_country: string | null;
  height_in_inches: number | null;
  weight_in_pounds: number | null;
  shoots_catches: string | null;
  is_active: boolean | null;
  sweater_number: number | null;
  draft_year: number | null;
  draft_team_abbrev: string | null;
  draft_round: number | null;
  draft_overall_pick: number | null;
};

type PlayerGameBaseRow = {
  nhl_game_id: number;
  game_date: string;
  game_type: number;
  is_home: boolean;
  team_nhl_team_id: number;
  team_abbreviation: string;
  team_name: string;
  opponent_nhl_team_id: number;
  opponent_abbreviation: string;
  opponent_name: string;
  team_score: number | null;
  opponent_score: number | null;
};

type SkaterGameLogRow = PlayerGameBaseRow & {
  goals: number;
  assists: number;
  points: number;
  plus_minus: number;
  penalty_minutes: number;
  shots_on_goal: number;
  hits: number;
  blocked_shots: number;
  time_on_ice_seconds: number | null;
  game_score: number | null;
  individual_x_goals: number | null;
  on_ice_x_goals_percentage: number | null;
};

type GoalieGameLogRow = PlayerGameBaseRow & {
  starter: boolean;
  decision: string | null;
  goals_against: number;
  shots_against: number;
  saves: number;
  save_percentage: number | null;
  time_on_ice_seconds: number | null;
  expected_goals_against: number | null;
};

const playerGameIdentitySelect = `
  game.nhl_id::integer AS nhl_game_id,
  game.game_date::text AS game_date,
  game.game_type,
  stats.team_id = game.home_team_id AS is_home,
  team.nhl_id::integer AS team_nhl_team_id,
  COALESCE(team_season.abbreviation, team.abbreviation) AS team_abbreviation,
  COALESCE(team_season.full_name, team.name) AS team_name,
  opponent.nhl_id::integer AS opponent_nhl_team_id,
  COALESCE(opponent_season.abbreviation, opponent.abbreviation) AS opponent_abbreviation,
  COALESCE(opponent_season.full_name, opponent.name) AS opponent_name,
  team_game.score AS team_score,
  opponent_game.score AS opponent_score
`;

const playerGameIdentityJoins = `
  JOIN players AS player
    ON player.id = stats.player_id
  JOIN games AS game
    ON game.id = stats.game_id
  JOIN teams AS team
    ON team.id = stats.team_id
  JOIN teams AS opponent
    ON opponent.id = CASE
      WHEN stats.team_id = game.away_team_id THEN game.home_team_id
      ELSE game.away_team_id
    END
  LEFT JOIN team_seasons AS team_season
    ON team_season.team_id = team.id
   AND team_season.season_id = game.season_id
  LEFT JOIN team_seasons AS opponent_season
    ON opponent_season.team_id = opponent.id
   AND opponent_season.season_id = game.season_id
  LEFT JOIN team_game_stats AS team_game
    ON team_game.game_id = game.id
   AND team_game.team_id = stats.team_id
  LEFT JOIN team_game_stats AS opponent_game
    ON opponent_game.game_id = game.id
   AND opponent_game.team_id = opponent.id
`;

export async function getTeamGameLog(
  nhlTeamId: number,
  seasonId: number,
): Promise<TeamGameLog | null> {
  const rows = await query<TeamGameLogRow>(
    `
      SELECT
        team.id::integer AS team_id,
        team.nhl_id::integer AS nhl_team_id,
        team.franchise_id,
        COALESCE(team_season.abbreviation, team.abbreviation) AS abbreviation,
        COALESCE(team_season.full_name, team.name) AS team_name,
        game.nhl_id::integer AS nhl_game_id,
        game.game_date::text AS game_date,
        game.game_type,
        game.last_period_type,
        stats.is_home,
        opponent.nhl_id::integer AS opponent_nhl_team_id,
        COALESCE(opponent_season.abbreviation, opponent.abbreviation) AS opponent_abbreviation,
        COALESCE(opponent_season.full_name, opponent.name) AS opponent_name,
        stats.score,
        opponent_stats.score AS opponent_score,
        stats.shots_on_goal,
        opponent_stats.shots_on_goal AS opponent_shots_on_goal,
        advanced.x_goals_percentage,
        advanced.x_goals_for,
        advanced.x_goals_against
      FROM team_game_stats AS stats
      JOIN games AS game
        ON game.id = stats.game_id
      JOIN teams AS team
        ON team.id = stats.team_id
      JOIN teams AS opponent
        ON opponent.id = CASE
          WHEN stats.team_id = game.away_team_id THEN game.home_team_id
          ELSE game.away_team_id
        END
      JOIN team_game_stats AS opponent_stats
        ON opponent_stats.game_id = game.id
       AND opponent_stats.team_id = opponent.id
      LEFT JOIN team_seasons AS team_season
        ON team_season.team_id = team.id
       AND team_season.season_id = game.season_id
      LEFT JOIN team_seasons AS opponent_season
        ON opponent_season.team_id = opponent.id
       AND opponent_season.season_id = game.season_id
      LEFT JOIN moneypuck_team_game_stats AS advanced
        ON advanced.game_id = game.id
       AND advanced.team_id = team.id
       AND advanced.situation = '5on5'
      WHERE team.nhl_id = $1
        AND game.season_id = $2
      ORDER BY game.game_date DESC, game.start_time_utc DESC, game.nhl_id DESC
    `,
    [nhlTeamId, seasonId],
  );

  const firstRow = rows[0];
  if (!firstRow) {
    return null;
  }

  return {
    team: mapTeam(firstRow),
    seasonId,
    games: rows.map(mapTeamGame),
  };
}

export async function getPlayerGameLog(
  nhlPlayerId: number,
  seasonId: number,
): Promise<PlayerGameLog | null> {
  const [profileRows, skaterRows, goalieRows] = await Promise.all([
    query<PlayerProfileRow>(
      `
        SELECT
          player.id::integer AS id,
          player.nhl_id::integer AS nhl_player_id,
          player.display_name AS player_name,
          player.position,
          player.birth_date::text AS birth_date,
          player.birth_city,
          player.birth_state_province,
          player.birth_country,
          player.height_in_inches,
          player.weight_in_pounds,
          player.shoots_catches,
          player.is_active,
          player.sweater_number,
          player.draft_year,
          player.draft_team_abbrev,
          player.draft_round,
          player.draft_overall_pick
        FROM players AS player
        WHERE player.nhl_id = $1
      `,
      [nhlPlayerId],
    ),
    query<SkaterGameLogRow>(
      `
        SELECT
          ${playerGameIdentitySelect},
          stats.goals,
          stats.assists,
          stats.points,
          stats.plus_minus,
          stats.penalty_minutes,
          stats.shots_on_goal,
          stats.hits,
          stats.blocked_shots,
          stats.time_on_ice_seconds,
          advanced.game_score,
          advanced.individual_x_goals,
          advanced.on_ice_x_goals_percentage
        FROM player_game_stats AS stats
        ${playerGameIdentityJoins}
        LEFT JOIN moneypuck_skater_game_stats AS advanced
          ON advanced.game_id = game.id
         AND advanced.player_id = player.id
         AND advanced.team_id = team.id
         AND advanced.situation = 'all'
        WHERE player.nhl_id = $1
          AND game.season_id = $2
        ORDER BY game.game_date DESC, game.start_time_utc DESC, game.nhl_id DESC
      `,
      [nhlPlayerId, seasonId],
    ),
    query<GoalieGameLogRow>(
      `
        SELECT
          ${playerGameIdentitySelect},
          stats.starter,
          stats.decision,
          stats.goals_against,
          stats.shots_against,
          stats.saves,
          stats.save_percentage,
          stats.time_on_ice_seconds,
          advanced.expected_goals_against
        FROM goalie_game_stats AS stats
        ${playerGameIdentityJoins}
        LEFT JOIN moneypuck_goalie_game_stats AS advanced
          ON advanced.game_id = game.id
         AND advanced.player_id = player.id
         AND advanced.team_id = team.id
         AND advanced.situation = 'all'
        WHERE player.nhl_id = $1
          AND game.season_id = $2
        ORDER BY game.game_date DESC, game.start_time_utc DESC, game.nhl_id DESC
      `,
      [nhlPlayerId, seasonId],
    ),
  ]);

  const profileRow = profileRows[0];
  if (!profileRow) {
    return null;
  }

  return {
    profile: mapPlayerProfile(profileRow),
    seasonId,
    skaterGames: skaterRows.map(mapSkaterGame),
    goalieGames: goalieRows.map(mapGoalieGame),
  };
}

export async function listPlayerGameSeasonIds(
  nhlPlayerId: number,
): Promise<number[]> {
  const rows = await query<{ season_id: number }>(
    `
      SELECT DISTINCT game.season_id
      FROM players AS player
      JOIN (
        SELECT player_id, game_id FROM player_game_stats
        UNION
        SELECT player_id, game_id FROM goalie_game_stats
      ) AS appearances
        ON appearances.player_id = player.id
      JOIN games AS game
        ON game.id = appearances.game_id
      WHERE player.nhl_id = $1
      ORDER BY game.season_id DESC
    `,
    [nhlPlayerId],
  );

  return rows.map((row) => row.season_id);
}

function mapTeam(row: TeamGameLogRow): TeamIdentity {
  return {
    id: row.team_id,
    nhlTeamId: row.nhl_team_id,
    franchiseId: row.franchise_id,
    abbreviation: row.abbreviation,
    name: row.team_name,
  };
}

function mapLogTeam(
  nhlTeamId: number,
  abbreviation: string,
  name: string,
): GameLogTeam {
  return { nhlTeamId, abbreviation, name };
}

function mapTeamGame(row: TeamGameLogRow): TeamGameLogEntry {
  const overtimeLoss =
    row.score < row.opponent_score &&
    (row.last_period_type === "OT" || row.last_period_type === "SO");

  return {
    nhlGameId: row.nhl_game_id,
    gameDate: row.game_date,
    gameType: row.game_type,
    lastPeriodType: row.last_period_type,
    isHome: row.is_home,
    opponent: mapLogTeam(
      row.opponent_nhl_team_id,
      row.opponent_abbreviation,
      row.opponent_name,
    ),
    score: row.score,
    opponentScore: row.opponent_score,
    result:
      row.score > row.opponent_score ? "W" : overtimeLoss ? "OTL" : "L",
    shotsOnGoal: row.shots_on_goal,
    opponentShotsOnGoal: row.opponent_shots_on_goal,
    fiveOnFiveXGoalsPercentage: row.x_goals_percentage,
    fiveOnFiveXGoalsFor: row.x_goals_for,
    fiveOnFiveXGoalsAgainst: row.x_goals_against,
  };
}

function mapPlayerProfile(row: PlayerProfileRow): PlayerProfile {
  const birthPlace = [
    row.birth_city,
    row.birth_state_province,
    row.birth_country,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    id: row.id,
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    position: row.position,
    birthDate: row.birth_date,
    birthPlace: birthPlace || null,
    heightInInches: row.height_in_inches,
    weightInPounds: row.weight_in_pounds,
    shootsCatches: row.shoots_catches,
    isActive: row.is_active,
    sweaterNumber: row.sweater_number,
    draftYear: row.draft_year,
    draftTeamAbbreviation: row.draft_team_abbrev,
    draftRound: row.draft_round,
    draftOverallPick: row.draft_overall_pick,
  };
}

function mapPlayerGameBase(row: PlayerGameBaseRow) {
  return {
    nhlGameId: row.nhl_game_id,
    gameDate: row.game_date,
    gameType: row.game_type,
    isHome: row.is_home,
    team: mapLogTeam(
      row.team_nhl_team_id,
      row.team_abbreviation,
      row.team_name,
    ),
    opponent: mapLogTeam(
      row.opponent_nhl_team_id,
      row.opponent_abbreviation,
      row.opponent_name,
    ),
    teamScore: row.team_score,
    opponentScore: row.opponent_score,
  };
}

function mapSkaterGame(row: SkaterGameLogRow): SkaterGameLogEntry {
  return {
    kind: "skater",
    ...mapPlayerGameBase(row),
    goals: row.goals,
    assists: row.assists,
    points: row.points,
    plusMinus: row.plus_minus,
    penaltyMinutes: row.penalty_minutes,
    shotsOnGoal: row.shots_on_goal,
    hits: row.hits,
    blockedShots: row.blocked_shots,
    timeOnIceSeconds: row.time_on_ice_seconds,
    gameScore: row.game_score,
    individualXGoals: row.individual_x_goals,
    onIceXGoalsPercentage: row.on_ice_x_goals_percentage,
  };
}

function mapGoalieGame(row: GoalieGameLogRow): GoalieGameLogEntry {
  return {
    kind: "goalie",
    ...mapPlayerGameBase(row),
    starter: row.starter,
    decision: row.decision,
    goalsAgainst: row.goals_against,
    shotsAgainst: row.shots_against,
    saves: row.saves,
    savePercentage: row.save_percentage,
    timeOnIceSeconds: row.time_on_ice_seconds,
    expectedGoalsAgainst: row.expected_goals_against,
    goalsSavedAboveExpected:
      row.expected_goals_against === null
        ? null
        : row.expected_goals_against - row.goals_against,
  };
}
