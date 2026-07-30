import "server-only";

import type {
  MoneyPuckSeasonUnitLeaders,
  MoneyPuckSeasonUnitPlayer,
  MoneyPuckSeasonUnitStats,
  MoneyPuckSeasonUnitType,
} from "@/contracts/season-unit";
import type { TeamIdentity } from "@/contracts/team";
import { query } from "@/data/database";

type SeasonUnitRow = {
  season_id: number;
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
  }: SeasonUnitOptions = {},
): Promise<MoneyPuckSeasonUnitStats[]> {
  const rows = await query<SeasonUnitRow>(
    `
      SELECT
        stats.season_id,
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

function mapSeasonUnit(row: SeasonUnitRow): MoneyPuckSeasonUnitStats {
  return {
    seasonId: row.season_id,
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

function mapTeam(row: SeasonUnitRow): TeamIdentity {
  return {
    id: row.team_id,
    nhlTeamId: row.nhl_team_id,
    franchiseId: row.franchise_id,
    abbreviation: row.abbreviation,
    name: row.team_name,
  };
}

function mapPlayers(row: SeasonUnitRow): MoneyPuckSeasonUnitPlayer[] {
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
