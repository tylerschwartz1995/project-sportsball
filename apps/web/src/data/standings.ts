import "server-only";

import type { StandingsEntry } from "@/contracts/standings";
import { query } from "@/data/database";

type StandingsRow = {
  snapshot_date: string;
  season_id: number;
  team_id: number;
  nhl_team_id: number;
  team_abbreviation: string;
  team_name: string;
  conference_name: string | null;
  division_name: string | null;
  games_played: number;
  wins: number;
  losses: number;
  overtime_losses: number;
  points: number;
  regulation_wins: number;
  regulation_plus_overtime_wins: number;
  goals_for: number;
  goals_against: number;
  goal_differential: number;
  point_percentage: number;
  league_rank: number;
  conference_rank: number | null;
  division_rank: number | null;
  wildcard_rank: number | null;
  clinch_indicator: string | null;
};

export async function getStandings(seasonId: number): Promise<StandingsEntry[]> {
  const rows = await query<StandingsRow>(
    `
      WITH latest_snapshot AS (
        SELECT MAX(snapshot_date) AS snapshot_date
        FROM official_standings_snapshots
        WHERE season_id = $1 AND game_type = 2
      )
      SELECT
        standings.snapshot_date::text AS snapshot_date,
        standings.season_id,
        team.id AS team_id,
        team.nhl_id AS nhl_team_id,
        COALESCE(team_season.abbreviation, team.abbreviation) AS team_abbreviation,
        COALESCE(team_season.full_name, team.name) AS team_name,
        standings.conference_name,
        standings.division_name,
        standings.games_played,
        standings.wins,
        standings.losses,
        standings.overtime_losses,
        standings.points,
        standings.regulation_wins,
        standings.regulation_plus_overtime_wins,
        standings.goals_for,
        standings.goals_against,
        standings.goal_differential,
        standings.point_percentage,
        standings.league_rank,
        standings.conference_rank,
        standings.division_rank,
        standings.wildcard_rank,
        standings.clinch_indicator
      FROM official_standings_snapshots AS standings
      JOIN latest_snapshot
        ON latest_snapshot.snapshot_date = standings.snapshot_date
      JOIN teams AS team
        ON team.id = standings.team_id
      LEFT JOIN team_seasons AS team_season
        ON team_season.team_id = team.id
       AND team_season.season_id = standings.season_id
      WHERE standings.season_id = $1
        AND standings.game_type = 2
      ORDER BY standings.league_rank, team_name
    `,
    [seasonId],
  );

  return rows.map((row) => ({
    snapshotDate: row.snapshot_date,
    seasonId: row.season_id,
    teamId: row.team_id,
    nhlTeamId: row.nhl_team_id,
    teamAbbreviation: row.team_abbreviation,
    teamName: row.team_name,
    conferenceName: row.conference_name,
    divisionName: row.division_name,
    gamesPlayed: row.games_played,
    wins: row.wins,
    losses: row.losses,
    overtimeLosses: row.overtime_losses,
    points: row.points,
    regulationWins: row.regulation_wins,
    regulationPlusOvertimeWins: row.regulation_plus_overtime_wins,
    goalsFor: row.goals_for,
    goalsAgainst: row.goals_against,
    goalDifferential: row.goal_differential,
    pointPercentage: row.point_percentage,
    leagueRank: row.league_rank,
    conferenceRank: row.conference_rank,
    divisionRank: row.division_rank,
    wildcardRank: row.wildcard_rank,
    clinchIndicator: row.clinch_indicator,
  }));
}
