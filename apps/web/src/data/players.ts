import "server-only";

import type {
  GoalieSeasonSummary,
  PlayerDetail,
  PlayerProfile,
  PlayerLocation,
  PlayerSeasonIndex,
  SkaterSeasonSummary,
} from "@/contracts/player";
import type { PageSlice } from "@/lib/directory";
import type { PlayerPositionFilter } from "@/lib/player-position";
import type { TeamIdentity } from "@/contracts/team";
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
  birth_city: string | null;
  birth_state_province: string | null;
  birth_country: string | null;
  season_id: number;
  game_type: number;
  games_played: number;
  teams_played_for: number;
  teams: TeamIdentity[];
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
  birth_city: string | null;
  birth_state_province: string | null;
  birth_country: string | null;
  season_id: number;
  game_type: number;
  games_played: number;
  teams_played_for: number;
  teams: TeamIdentity[];
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

type PlayerCountRow = {
  total: string;
};

type PlayerLocationRow = {
  country: string;
  region: string | null;
  city: string | null;
};

type PlayerDirectoryOptions = {
  seasonId: number;
  gameType?: number;
  query: string;
  sort: string;
  direction: "asc" | "desc";
  requestedPage: number;
  pageSize?: number;
  minGames: number;
  country: string;
  region: string;
  city: string;
};

export type SkaterDirectoryOptions = PlayerDirectoryOptions & {
  position: PlayerPositionFilter;
  minGoals: number;
  minAssists: number;
  minPoints: number;
};

export type GoalieDirectoryOptions = PlayerDirectoryOptions & {
  minWins: number;
  minSavePercentage: number;
};

export type PlayerDirectoryPage<Player> = PageSlice<Player> & {
  locations: PlayerLocation[];
};

const skaterSelect = `
  SELECT
    player.nhl_id::integer AS nhl_player_id,
    player.display_name AS player_name,
    player.position,
    player.birth_city,
    player.birth_state_province,
    player.birth_country,
    stats.season_id,
    stats.game_type,
    stats.games_played,
    stats.teams_played_for,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', team.id,
          'nhlTeamId', team.nhl_id,
          'franchiseId', team.franchise_id,
          'abbreviation', COALESCE(team_season.abbreviation, team.abbreviation),
          'name', COALESCE(team_season.full_name, team.name)
        )
        ORDER BY split.games_played DESC, team.name
      )
      FROM official_skater_season_stats AS split
      JOIN teams AS team ON team.id = split.team_id
      LEFT JOIN team_seasons AS team_season
        ON team_season.team_id = team.id
       AND team_season.season_id = split.season_id
      WHERE split.player_id = stats.player_id
        AND split.season_id = stats.season_id
        AND split.game_type = stats.game_type
    ), '[]'::jsonb) AS teams,
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
    player.birth_city,
    player.birth_state_province,
    player.birth_country,
    stats.season_id,
    stats.game_type,
    stats.games_played,
    stats.teams_played_for,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', team.id,
          'nhlTeamId', team.nhl_id,
          'franchiseId', team.franchise_id,
          'abbreviation', COALESCE(team_season.abbreviation, team.abbreviation),
          'name', COALESCE(team_season.full_name, team.name)
        )
        ORDER BY split.games_played DESC, team.name
      )
      FROM official_goalie_season_stats AS split
      JOIN teams AS team ON team.id = split.team_id
      LEFT JOIN team_seasons AS team_season
        ON team_season.team_id = team.id
       AND team_season.season_id = split.season_id
      WHERE split.player_id = stats.player_id
        AND split.season_id = stats.season_id
        AND split.game_type = stats.game_type
    ), '[]'::jsonb) AS teams,
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

export async function listSkaterDirectoryPage(
  options: SkaterDirectoryOptions,
): Promise<PlayerDirectoryPage<SkaterSeasonSummary>> {
  const gameType = options.gameType ?? 2;
  const pageSize = boundedPageSize(options.pageSize);
  const values: unknown[] = [options.seasonId, gameType];
  const conditions = buildCommonDirectoryConditions(options, values);

  if (options.position) {
    values.push(
      options.position === "F" ? ["C", "L", "R"] : [options.position],
    );
    conditions.push(`UPPER(COALESCE(player.position, '')) = ANY($${values.length}::text[])`);
  }
  addMinimumCondition(conditions, values, "stats.games_played", options.minGames);
  addMinimumCondition(conditions, values, "stats.goals", options.minGoals);
  addMinimumCondition(conditions, values, "stats.assists", options.minAssists);
  addMinimumCondition(conditions, values, "stats.points", options.minPoints);

  return listDirectoryPage({
    table: "skater_season_stats",
    select: skaterSelect,
    conditions,
    values,
    orderBy: skaterDirectoryOrder(options.sort, options.direction),
    requestedPage: options.requestedPage,
    pageSize,
    mapRow: mapSkater,
  });
}

export async function listGoalieDirectoryPage(
  options: GoalieDirectoryOptions,
): Promise<PlayerDirectoryPage<GoalieSeasonSummary>> {
  const gameType = options.gameType ?? 2;
  const pageSize = boundedPageSize(options.pageSize);
  const values: unknown[] = [options.seasonId, gameType];
  const conditions = buildCommonDirectoryConditions(options, values);

  addMinimumCondition(conditions, values, "stats.games_played", options.minGames);
  addMinimumCondition(conditions, values, "stats.wins", options.minWins);
  addMinimumCondition(
    conditions,
    values,
    "COALESCE(stats.save_percentage, 0)",
    options.minSavePercentage,
  );

  return listDirectoryPage({
    table: "goalie_season_stats",
    select: goalieSelect,
    conditions,
    values,
    orderBy: goalieDirectoryOrder(options.sort, options.direction),
    requestedPage: options.requestedPage,
    pageSize,
    mapRow: mapGoalie,
  });
}

type DirectoryConfig<Row extends Record<string, unknown>, Player> = {
  table: "skater_season_stats" | "goalie_season_stats";
  select: string;
  conditions: string[];
  values: unknown[];
  orderBy: string;
  requestedPage: number;
  pageSize: number;
  mapRow: (row: Row) => Player;
};

async function listDirectoryPage<Row extends Record<string, unknown>, Player>({
  table,
  select,
  conditions,
  values,
  orderBy,
  requestedPage,
  pageSize,
  mapRow,
}: DirectoryConfig<Row, Player>): Promise<PlayerDirectoryPage<Player>> {
  const where = conditions.join("\n          AND ");
  const [countRows, locationRows] = await Promise.all([
    query<PlayerCountRow>(
      `
        SELECT COUNT(*)::text AS total
        FROM ${table} AS stats
        JOIN players AS player ON player.id = stats.player_id
        WHERE ${where}
      `,
      values,
    ),
    query<PlayerLocationRow>(
      `
        SELECT DISTINCT
          player.birth_country AS country,
          player.birth_state_province AS region,
          player.birth_city AS city
        FROM ${table} AS stats
        JOIN players AS player ON player.id = stats.player_id
        WHERE stats.season_id = $1
          AND stats.game_type = $2
          AND player.birth_country IS NOT NULL
        ORDER BY country, region NULLS FIRST, city NULLS FIRST
      `,
      values.slice(0, 2),
    ),
  ]);
  const totalItems = Number(countRows[0]?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(optionsPage(requestedPage), 1), totalPages);
  const offset = (currentPage - 1) * pageSize;
  const pageValues = [...values, pageSize, offset];
  const rows = await query<Row>(
    `
      ${select}
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `,
    pageValues,
  );

  return {
    items: rows.map(mapRow),
    currentPage,
    totalPages,
    totalItems,
    firstItem: rows.length === 0 ? 0 : offset + 1,
    lastItem: offset + rows.length,
    locations: locationRows.map((row) => ({
      country: row.country,
      region: row.region,
      city: row.city,
    })),
  };
}

function buildCommonDirectoryConditions(
  options: PlayerDirectoryOptions,
  values: unknown[],
): string[] {
  const conditions = ["stats.season_id = $1", "stats.game_type = $2"];
  if (options.query) {
    values.push(options.query.toLocaleLowerCase());
    conditions.push(`strpos(
      lower(concat_ws(' ',
        player.display_name,
        player.position,
        CASE UPPER(COALESCE(player.position, ''))
          WHEN 'C' THEN 'Center'
          WHEN 'D' THEN 'Defenseman'
          WHEN 'G' THEN 'Goalie'
          WHEN 'L' THEN 'LW Left Wing'
          WHEN 'R' THEN 'RW Right Wing'
          ELSE ''
        END
      )),
      $${values.length}
    ) > 0`);
  }
  addTextCondition(conditions, values, "player.birth_country", options.country);
  addTextCondition(conditions, values, "player.birth_state_province", options.region);
  addTextCondition(conditions, values, "player.birth_city", options.city);
  return conditions;
}

function addTextCondition(
  conditions: string[],
  values: unknown[],
  column: string,
  value: string,
) {
  if (!value) return;
  values.push(value);
  conditions.push(`${column} = $${values.length}`);
}

function addMinimumCondition(
  conditions: string[],
  values: unknown[],
  column: string,
  value: number,
) {
  if (value <= 0) return;
  values.push(value);
  conditions.push(`${column} >= $${values.length}`);
}

function boundedPageSize(value: number | undefined): number {
  return Math.max(1, Math.min(Math.trunc(value ?? 50), 100));
}

function optionsPage(value: number): number {
  return Number.isSafeInteger(value) && value > 0 ? value : 1;
}

function sortDirection(value: "asc" | "desc"): "ASC" | "DESC" {
  return value === "asc" ? "ASC" : "DESC";
}

function skaterDirectoryOrder(sort: string, direction: "asc" | "desc"): string {
  const order = sortDirection(direction);
  const columns: Record<string, string[]> = {
    goals: ["stats.goals", "stats.points"],
    assists: ["stats.assists", "stats.points"],
    games: ["stats.games_played", "stats.points"],
    plusMinus: ["stats.plus_minus", "stats.points"],
    penaltyMinutes: ["stats.penalty_minutes", "stats.points"],
    shotsOnGoal: ["stats.shots_on_goal", "stats.points"],
    teamsPlayedFor: ["stats.teams_played_for", "stats.points"],
    name: ["player.display_name"],
    points: ["stats.points", "stats.goals"],
  };
  const selected = columns[sort] ?? columns.points;
  const clauses = selected.map((column) => `${column} ${order}`);
  clauses.push(
    `player.display_name ${sort === "points" ? (order === "ASC" ? "DESC" : "ASC") : "ASC"}`,
  );
  clauses.push("player.nhl_id ASC");
  return clauses.join(", ");
}

function goalieDirectoryOrder(sort: string, direction: "asc" | "desc"): string {
  const order = sortDirection(direction);
  const columns: Record<string, string[]> = {
    wins: ["stats.wins", "stats.games_played"],
    games: ["stats.games_played", "stats.wins"],
    gamesStarted: ["stats.games_started", "stats.games_played"],
    losses: ["stats.losses", "stats.games_played"],
    overtimeLosses: ["stats.overtime_losses", "stats.games_played"],
    goalsAgainst: ["stats.goals_against", "stats.games_played"],
    saves: ["stats.saves", "stats.games_played"],
    name: ["player.display_name"],
  };
  if (sort === "savePercentage" || !(sort in columns)) {
    return `stats.save_percentage ${order} NULLS ${order === "ASC" ? "FIRST" : "LAST"}, stats.games_played ${order}, player.display_name ${order === "ASC" ? "DESC" : "ASC"}, player.nhl_id ASC`;
  }
  const clauses = columns[sort].map((column) => `${column} ${order}`);
  clauses.push("player.display_name ASC", "player.nhl_id ASC");
  return clauses.join(", ");
}

export async function listSkaterLeadersBySeason(
  seasonId: number,
  limit = 5,
  gameType = 2,
): Promise<SkaterSeasonSummary[]> {
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 100));
  const rows = await query<SkaterRow>(
    `
      ${skaterSelect}
      WHERE stats.season_id = $1
        AND stats.game_type = $2
      ORDER BY stats.points DESC, stats.goals DESC, player.display_name
      LIMIT $3
    `,
    [seasonId, gameType, safeLimit],
  );

  return rows.map(mapSkater);
}

export async function listGoalieLeadersBySeason(
  seasonId: number,
  limit = 25,
  gameType = 2,
): Promise<GoalieSeasonSummary[]> {
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 100));
  const rows = await query<GoalieRow>(
    `
      ${goalieSelect}
      WHERE stats.season_id = $1
        AND stats.game_type = $2
      ORDER BY stats.wins DESC, stats.games_played DESC, player.display_name
      LIMIT $3
    `,
    [seasonId, gameType, safeLimit],
  );

  return rows.map(mapGoalie);
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
    birthCity: row.birth_city,
    birthStateProvince: row.birth_state_province,
    birthCountry: row.birth_country,
    seasonId: row.season_id,
    gameType: row.game_type,
    gamesPlayed: row.games_played,
    teamsPlayedFor: row.teams_played_for,
    teams: row.teams ?? [],
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
    birthCity: row.birth_city,
    birthStateProvince: row.birth_state_province,
    birthCountry: row.birth_country,
    seasonId: row.season_id,
    gameType: row.game_type,
    gamesPlayed: row.games_played,
    teamsPlayedFor: row.teams_played_for,
    teams: row.teams ?? [],
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
