import "server-only";

import type {
  PlayoffScoringLeader,
  PlayoffSeriesInsights,
  PlayoffSeriesPlayerLeader,
  PlayoffSeriesSituationAnalytics,
  PlayoffSeriesTeamAnalytics,
} from "@/contracts/playoffs";
import { query } from "@/data/database";

type PlayoffScoringRow = {
  nhl_player_id: number;
  player_name: string;
  team_abbreviation: string;
  games_played: number;
  goals: number;
  assists: number;
  points: number;
};

type PlayoffSeriesAnalyticsRow = {
  round: number;
  matchup: number;
  nhl_team_id: number;
  team_abbreviation: string;
  team_name: string;
  situation: "all" | "5on5";
  games: number;
  expected_goals_for: string | null;
  expected_goals_against: string | null;
  shot_attempts_for: string | null;
  shot_attempts_against: string | null;
};

type PlayoffSeriesLeaderRow = {
  round: number;
  matchup: number;
  nhl_player_id: number;
  player_name: string;
  nhl_team_id: number;
  team_abbreviation: string;
  games_played: number;
  goals: number;
  assists: number;
  points: number;
};

export async function getPlayoffScoringLeaders(
  seasonId: number,
  limit = 25,
): Promise<PlayoffScoringLeader[]> {
  const rows = await query<PlayoffScoringRow>(
    `
      SELECT
        player.nhl_id::integer AS nhl_player_id,
        player.display_name AS player_name,
        STRING_AGG(
          DISTINCT COALESCE(team_season.abbreviation, team.abbreviation),
          '/'
        ) AS team_abbreviation,
        COUNT(DISTINCT game.id)::integer AS games_played,
        SUM(stats.goals)::integer AS goals,
        SUM(stats.assists)::integer AS assists,
        SUM(stats.points)::integer AS points
      FROM player_game_stats AS stats
      JOIN players AS player
        ON player.id = stats.player_id
      JOIN games AS game
        ON game.id = stats.game_id
      JOIN teams AS team
        ON team.id = stats.team_id
      LEFT JOIN team_seasons AS team_season
        ON team_season.team_id = team.id
       AND team_season.season_id = game.season_id
      WHERE game.season_id = $1
        AND game.game_type = 3
      GROUP BY player.nhl_id, player.display_name
      ORDER BY points DESC, goals DESC, player_name
      LIMIT $2
    `,
    [seasonId, limit],
  );

  return rows.map((row) => ({
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    teamAbbreviation: row.team_abbreviation,
    gamesPlayed: row.games_played,
    goals: row.goals,
    assists: row.assists,
    points: row.points,
  }));
}

export async function getPlayoffSeriesInsights(
  seasonId: number,
): Promise<PlayoffSeriesInsights[]> {
  const [analyticsRows, leaderRows] = await Promise.all([
    query<PlayoffSeriesAnalyticsRow>(
      `
        SELECT
          ((game.nhl_id % 1000) / 100)::integer AS round,
          ((game.nhl_id % 100) / 10)::integer AS matchup,
          team.nhl_id::integer AS nhl_team_id,
          COALESCE(team_season.abbreviation, team.abbreviation)
            AS team_abbreviation,
          COALESCE(team_season.full_name, team.name) AS team_name,
          stats.situation,
          COUNT(DISTINCT game.id)::integer AS games,
          SUM(stats.x_goals_for)::text AS expected_goals_for,
          SUM(stats.x_goals_against)::text AS expected_goals_against,
          SUM(stats.shot_attempts_for)::text AS shot_attempts_for,
          SUM(stats.shot_attempts_against)::text AS shot_attempts_against
        FROM moneypuck_team_game_stats AS stats
        JOIN games AS game
          ON game.id = stats.game_id
        JOIN teams AS team
          ON team.id = stats.team_id
        LEFT JOIN team_seasons AS team_season
          ON team_season.team_id = team.id
         AND team_season.season_id = game.season_id
        WHERE game.season_id = $1
          AND game.game_type = 3
          AND stats.situation IN ('all', '5on5')
        GROUP BY
          round,
          matchup,
          team.nhl_id,
          team_season.abbreviation,
          team.abbreviation,
          team_season.full_name,
          team.name,
          stats.situation
        ORDER BY round, matchup, team_abbreviation, stats.situation
      `,
      [seasonId],
    ),
    query<PlayoffSeriesLeaderRow>(
      `
        WITH player_totals AS (
          SELECT
            ((game.nhl_id % 1000) / 100)::integer AS round,
            ((game.nhl_id % 100) / 10)::integer AS matchup,
            player.nhl_id::integer AS nhl_player_id,
            player.display_name AS player_name,
            team.nhl_id::integer AS nhl_team_id,
            COALESCE(team_season.abbreviation, team.abbreviation)
              AS team_abbreviation,
            COUNT(DISTINCT game.id)::integer AS games_played,
            SUM(stats.goals)::integer AS goals,
            SUM(stats.assists)::integer AS assists,
            SUM(stats.points)::integer AS points
          FROM player_game_stats AS stats
          JOIN players AS player
            ON player.id = stats.player_id
          JOIN games AS game
            ON game.id = stats.game_id
          JOIN teams AS team
            ON team.id = stats.team_id
          LEFT JOIN team_seasons AS team_season
            ON team_season.team_id = team.id
           AND team_season.season_id = game.season_id
          WHERE game.season_id = $1
            AND game.game_type = 3
          GROUP BY
            round,
            matchup,
            player.nhl_id,
            player.display_name,
            team.nhl_id,
            team_season.abbreviation,
            team.abbreviation
        ),
        ranked AS (
          SELECT
            player_totals.*,
            ROW_NUMBER() OVER (
              PARTITION BY round, matchup
              ORDER BY points DESC, goals DESC, player_name
            ) AS series_rank
          FROM player_totals
        )
        SELECT
          round,
          matchup,
          nhl_player_id,
          player_name,
          nhl_team_id,
          team_abbreviation,
          games_played,
          goals,
          assists,
          points
        FROM ranked
        WHERE series_rank <= 8
        ORDER BY round, matchup, series_rank
      `,
      [seasonId],
    ),
  ]);

  const bySeries = new Map<string, PlayoffSeriesInsights>();
  const getSeries = (round: number, matchup: number) => {
    const id = `${round}-${matchup}`;
    const existing = bySeries.get(id);
    if (existing) return existing;
    const created: PlayoffSeriesInsights = {
      id,
      teamAnalytics: [],
      playerLeaders: [],
    };
    bySeries.set(id, created);
    return created;
  };

  const analyticsByTeam = new Map<string, PlayoffSeriesTeamAnalytics>();
  for (const row of analyticsRows) {
    const series = getSeries(row.round, row.matchup);
    const teamKey = `${series.id}-${row.nhl_team_id}`;
    let team = analyticsByTeam.get(teamKey);
    if (!team) {
      team = {
        nhlTeamId: row.nhl_team_id,
        abbreviation: row.team_abbreviation,
        name: row.team_name,
        allSituations: null,
        fiveOnFive: null,
      };
      analyticsByTeam.set(teamKey, team);
      series.teamAnalytics.push(team);
    }
    const metrics = situationAnalytics(row);
    if (row.situation === "all") team.allSituations = metrics;
    if (row.situation === "5on5") team.fiveOnFive = metrics;
  }

  for (const row of leaderRows) {
    getSeries(row.round, row.matchup).playerLeaders.push(playerLeader(row));
  }

  return [...bySeries.values()];
}

function situationAnalytics(
  row: PlayoffSeriesAnalyticsRow,
): PlayoffSeriesSituationAnalytics {
  const expectedGoalsFor = nullableNumber(row.expected_goals_for);
  const expectedGoalsAgainst = nullableNumber(row.expected_goals_against);
  const shotAttemptsFor = nullableNumber(row.shot_attempts_for);
  const shotAttemptsAgainst = nullableNumber(row.shot_attempts_against);

  return {
    games: row.games,
    expectedGoalsFor,
    expectedGoalsAgainst,
    expectedGoalsShare: share(expectedGoalsFor, expectedGoalsAgainst),
    shotAttemptsFor,
    shotAttemptsAgainst,
    shotAttemptShare: share(shotAttemptsFor, shotAttemptsAgainst),
  };
}

function playerLeader(row: PlayoffSeriesLeaderRow): PlayoffSeriesPlayerLeader {
  return {
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    nhlTeamId: row.nhl_team_id,
    teamAbbreviation: row.team_abbreviation,
    gamesPlayed: row.games_played,
    goals: row.goals,
    assists: row.assists,
    points: row.points,
  };
}

function nullableNumber(value: string | null): number | null {
  return value === null ? null : Number(value);
}

function share(forValue: number | null, againstValue: number | null) {
  if (forValue === null || againstValue === null) return null;
  const total = forValue + againstValue;
  return total > 0 ? forValue / total : null;
}
