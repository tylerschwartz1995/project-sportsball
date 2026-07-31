import "server-only";

import type {
  GoalieSeasonSummary,
  PlayerDetail,
  PlayerProfile,
  PlayerSeasonIndex,
  SkaterSeasonSummary,
} from "@/contracts/player";
import { query } from "@/data/database";

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

type SkaterRow = {
  nhl_player_id: number;
  player_name: string;
  position: string | null;
  season_id: number;
  game_type: number;
  games_played: number;
  teams_played_for: number;
  goals: number;
  assists: number;
  points: number;
  plus_minus: number;
  penalty_minutes: number;
  power_play_goals: number;
  shots_on_goal: number;
  hits: number;
  blocked_shots: number;
  time_on_ice_seconds: number | null;
};

type GoalieRow = {
  nhl_player_id: number;
  player_name: string;
  position: string | null;
  season_id: number;
  game_type: number;
  games_played: number;
  teams_played_for: number;
  games_started: number;
  wins: number;
  losses: number;
  overtime_losses: number;
  goals_against: number;
  shots_against: number;
  saves: number;
  save_percentage: number | null;
  time_on_ice_seconds: number;
};

const skaterSelect = `
  SELECT
    player.nhl_id::integer AS nhl_player_id,
    player.display_name AS player_name,
    player.position,
    stats.season_id,
    stats.game_type,
    stats.games_played,
    stats.teams_played_for,
    stats.goals,
    stats.assists,
    stats.points,
    stats.plus_minus,
    stats.penalty_minutes,
    stats.power_play_goals,
    stats.shots_on_goal,
    stats.hits,
    stats.blocked_shots,
    stats.time_on_ice_seconds
  FROM skater_season_stats AS stats
  JOIN players AS player
    ON player.id = stats.player_id
`;

const goalieSelect = `
  SELECT
    player.nhl_id::integer AS nhl_player_id,
    player.display_name AS player_name,
    player.position,
    stats.season_id,
    stats.game_type,
    stats.games_played,
    stats.teams_played_for,
    stats.games_started,
    stats.wins,
    stats.losses,
    stats.overtime_losses,
    stats.goals_against,
    stats.shots_against,
    stats.saves,
    stats.save_percentage,
    stats.time_on_ice_seconds
  FROM goalie_season_stats AS stats
  JOIN players AS player
    ON player.id = stats.player_id
`;

export async function listPlayersBySeason(
  seasonId: number,
  gameType = 2,
): Promise<PlayerSeasonIndex> {
  const [skaterRows, goalieRows] = await Promise.all([
    query<SkaterRow>(
      `
        ${skaterSelect}
        WHERE stats.season_id = $1
          AND stats.game_type = $2
        ORDER BY stats.points DESC, stats.goals DESC, player.display_name
      `,
      [seasonId, gameType],
    ),
    query<GoalieRow>(
      `
        ${goalieSelect}
        WHERE stats.season_id = $1
          AND stats.game_type = $2
        ORDER BY stats.games_played DESC, stats.wins DESC, player.display_name
      `,
      [seasonId, gameType],
    ),
  ]);

  return {
    seasonId,
    skaters: skaterRows.map(mapSkater),
    goalies: goalieRows.map(mapGoalie),
  };
}

export async function getPlayerDetail(
  nhlPlayerId: number,
): Promise<PlayerDetail | null> {
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
    query<SkaterRow>(
      `
        ${skaterSelect}
        WHERE player.nhl_id = $1
        ORDER BY stats.season_id DESC, stats.game_type
      `,
      [nhlPlayerId],
    ),
    query<GoalieRow>(
      `
        ${goalieSelect}
        WHERE player.nhl_id = $1
        ORDER BY stats.season_id DESC, stats.game_type
      `,
      [nhlPlayerId],
    ),
  ]);

  const profileRow = profileRows[0];
  if (!profileRow) {
    return null;
  }

  return {
    profile: mapProfile(profileRow),
    skaterSeasons: skaterRows.map(mapSkater),
    goalieSeasons: goalieRows.map(mapGoalie),
  };
}

function mapProfile(row: PlayerProfileRow): PlayerProfile {
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

function mapSkater(row: SkaterRow): SkaterSeasonSummary {
  return {
    kind: "skater",
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    position: row.position,
    seasonId: row.season_id,
    gameType: row.game_type,
    gamesPlayed: row.games_played,
    teamsPlayedFor: row.teams_played_for,
    goals: row.goals,
    assists: row.assists,
    points: row.points,
    plusMinus: row.plus_minus,
    penaltyMinutes: row.penalty_minutes,
    powerPlayGoals: row.power_play_goals,
    shotsOnGoal: row.shots_on_goal,
    hits: row.hits,
    blockedShots: row.blocked_shots,
    timeOnIceSeconds: row.time_on_ice_seconds,
  };
}

function mapGoalie(row: GoalieRow): GoalieSeasonSummary {
  return {
    kind: "goalie",
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    position: row.position,
    seasonId: row.season_id,
    gameType: row.game_type,
    gamesPlayed: row.games_played,
    teamsPlayedFor: row.teams_played_for,
    gamesStarted: row.games_started,
    wins: row.wins,
    losses: row.losses,
    overtimeLosses: row.overtime_losses,
    goalsAgainst: row.goals_against,
    shotsAgainst: row.shots_against,
    saves: row.saves,
    savePercentage: row.save_percentage,
    timeOnIceSeconds: row.time_on_ice_seconds,
  };
}
