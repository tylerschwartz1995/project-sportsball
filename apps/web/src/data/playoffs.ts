import "server-only";

import type {
  PlayoffScoringLeader,
  PlayoffSeriesAdvancedGoalieStats,
  PlayoffSeriesAdvancedSkaterStats,
  PlayoffSeriesGoalieStats,
  PlayoffSeriesInsights,
  PlayoffSeriesPlayerStatsPackage,
  PlayoffSeriesSituationAnalytics,
  PlayoffSeriesSkaterStats,
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

type PlayoffSeriesSkaterRow = {
  nhl_player_id: number;
  player_name: string;
  nhl_team_id: number;
  team_abbreviation: string;
  position: string;
  games_played: number;
  goals: number;
  assists: number;
  points: number;
  plus_minus: number;
  penalty_minutes: number;
  hits: number;
  power_play_goals: number;
  shots_on_goal: number;
  blocked_shots: number;
  takeaways: number;
  giveaways: number;
  time_on_ice_seconds: number | null;
};

type PlayoffSeriesGoalieRow = {
  nhl_player_id: number;
  player_name: string;
  nhl_team_id: number;
  team_abbreviation: string;
  games_played: number;
  games_started: number;
  wins: number;
  losses: number;
  goals_against: number;
  shots_against: number;
  saves: number;
  time_on_ice_seconds: number | null;
};

type PlayoffSeriesAdvancedSkaterRow = {
  nhl_player_id: number;
  player_name: string;
  nhl_team_id: number;
  team_abbreviation: string;
  shot_attempts: number;
  shots_on_goal: number;
  goals: number;
  expected_goals: string;
  average_shot_distance: string | null;
  rush_attempts: number;
  rebound_attempts: number;
};

type PlayoffSeriesAdvancedGoalieRow = {
  nhl_player_id: number;
  player_name: string;
  nhl_team_id: number;
  team_abbreviation: string;
  shots_against: number;
  goals_against: number;
  expected_goals_against: string;
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
  const analyticsRows = await query<PlayoffSeriesAnalyticsRow>(
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
  );

  const bySeries = new Map<string, PlayoffSeriesInsights>();
  const getSeries = (round: number, matchup: number) => {
    const id = `${round}-${matchup}`;
    const existing = bySeries.get(id);
    if (existing) return existing;
    const created: PlayoffSeriesInsights = {
      id,
      teamAnalytics: [],
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

  return [...bySeries.values()];
}

export async function getPlayoffSeriesPlayerStats(
  seasonId: number,
  round: number,
  matchup: number,
): Promise<PlayoffSeriesPlayerStatsPackage> {
  const seriesFilter = `
    game.season_id = $1
    AND game.game_type = 3
    AND ((game.nhl_id % 1000) / 100)::integer = $2
    AND ((game.nhl_id % 100) / 10)::integer = $3
  `;
  const values = [seasonId, round, matchup];

  const [skaterRows, goalieRows, advancedSkaterRows, advancedGoalieRows] =
    await Promise.all([
      query<PlayoffSeriesSkaterRow>(
      `
        SELECT
          player.nhl_id::integer AS nhl_player_id,
          player.display_name AS player_name,
          team.nhl_id::integer AS nhl_team_id,
          COALESCE(team_season.abbreviation, team.abbreviation)
            AS team_abbreviation,
          MAX(stats.position) AS position,
          COUNT(DISTINCT game.id)::integer AS games_played,
          SUM(stats.goals)::integer AS goals,
          SUM(stats.assists)::integer AS assists,
          SUM(stats.points)::integer AS points,
          SUM(stats.plus_minus)::integer AS plus_minus,
          SUM(stats.penalty_minutes)::integer AS penalty_minutes,
          SUM(stats.hits)::integer AS hits,
          SUM(stats.power_play_goals)::integer AS power_play_goals,
          SUM(stats.shots_on_goal)::integer AS shots_on_goal,
          SUM(stats.blocked_shots)::integer AS blocked_shots,
          SUM(stats.takeaways)::integer AS takeaways,
          SUM(stats.giveaways)::integer AS giveaways,
          SUM(stats.time_on_ice_seconds)::integer AS time_on_ice_seconds
        FROM player_game_stats AS stats
        JOIN players AS player ON player.id = stats.player_id
        JOIN games AS game ON game.id = stats.game_id
        JOIN teams AS team ON team.id = stats.team_id
        LEFT JOIN team_seasons AS team_season
          ON team_season.team_id = team.id
         AND team_season.season_id = game.season_id
        WHERE ${seriesFilter}
        GROUP BY
          player.nhl_id,
          player.display_name,
          team.nhl_id,
          team_season.abbreviation,
          team.abbreviation
        ORDER BY points DESC, goals DESC, player_name
      `,
        values,
      ),
      query<PlayoffSeriesGoalieRow>(
        `
          SELECT
            player.nhl_id::integer AS nhl_player_id,
            player.display_name AS player_name,
            team.nhl_id::integer AS nhl_team_id,
            COALESCE(team_season.abbreviation, team.abbreviation)
              AS team_abbreviation,
            COUNT(DISTINCT game.id) FILTER (
              WHERE COALESCE(stats.time_on_ice_seconds, 0) > 0
            )::integer AS games_played,
            COUNT(*) FILTER (WHERE stats.starter)::integer AS games_started,
            COUNT(*) FILTER (WHERE stats.decision = 'W')::integer AS wins,
            COUNT(*) FILTER (WHERE stats.decision = 'L')::integer AS losses,
            SUM(stats.goals_against)::integer AS goals_against,
            SUM(stats.shots_against)::integer AS shots_against,
            SUM(stats.saves)::integer AS saves,
            SUM(stats.time_on_ice_seconds)::integer AS time_on_ice_seconds
          FROM goalie_game_stats AS stats
          JOIN players AS player ON player.id = stats.player_id
          JOIN games AS game ON game.id = stats.game_id
          JOIN teams AS team ON team.id = stats.team_id
          LEFT JOIN team_seasons AS team_season
            ON team_season.team_id = team.id
           AND team_season.season_id = game.season_id
          WHERE ${seriesFilter}
          GROUP BY
            player.nhl_id,
            player.display_name,
            team.nhl_id,
            team_season.abbreviation,
            team.abbreviation
          HAVING COALESCE(SUM(stats.time_on_ice_seconds), 0) > 0
          ORDER BY wins DESC, saves DESC, player_name
        `,
        values,
      ),
      query<PlayoffSeriesAdvancedSkaterRow>(
        `
          SELECT
            player.nhl_id::integer AS nhl_player_id,
            player.display_name AS player_name,
            team.nhl_id::integer AS nhl_team_id,
            COALESCE(team_season.abbreviation, team.abbreviation)
              AS team_abbreviation,
            COUNT(*)::integer AS shot_attempts,
            COUNT(*) FILTER (WHERE stats.was_on_goal)::integer AS shots_on_goal,
            COUNT(*) FILTER (WHERE stats.is_goal)::integer AS goals,
            COALESCE(SUM(stats.x_goal), 0)::text AS expected_goals,
            AVG(stats.shot_distance)::text AS average_shot_distance,
            COUNT(*) FILTER (WHERE stats.was_rush)::integer AS rush_attempts,
            COUNT(*) FILTER (WHERE stats.was_rebound)::integer AS rebound_attempts
          FROM moneypuck_shots AS stats
          JOIN players AS player ON player.id = stats.shooter_player_id
          JOIN games AS game ON game.id = stats.game_id
          JOIN teams AS team ON team.id = stats.shooting_team_id
          LEFT JOIN team_seasons AS team_season
            ON team_season.team_id = team.id
           AND team_season.season_id = game.season_id
          WHERE ${seriesFilter}
          GROUP BY
            player.nhl_id,
            player.display_name,
            team.nhl_id,
            team_season.abbreviation,
            team.abbreviation
          ORDER BY expected_goals DESC, goals DESC, player_name
        `,
        values,
      ),
      query<PlayoffSeriesAdvancedGoalieRow>(
        `
          SELECT
            player.nhl_id::integer AS nhl_player_id,
            player.display_name AS player_name,
            team.nhl_id::integer AS nhl_team_id,
            COALESCE(team_season.abbreviation, team.abbreviation)
              AS team_abbreviation,
            COUNT(*) FILTER (WHERE stats.was_on_goal)::integer AS shots_against,
            COUNT(*) FILTER (WHERE stats.is_goal)::integer AS goals_against,
            COALESCE(SUM(stats.x_goal), 0)::text AS expected_goals_against
          FROM moneypuck_shots AS stats
          JOIN players AS player ON player.id = stats.goalie_player_id
          JOIN games AS game ON game.id = stats.game_id
          JOIN teams AS team ON team.id = stats.defending_team_id
          LEFT JOIN team_seasons AS team_season
            ON team_season.team_id = team.id
           AND team_season.season_id = game.season_id
          WHERE ${seriesFilter}
          GROUP BY
            player.nhl_id,
            player.display_name,
            team.nhl_id,
            team_season.abbreviation,
            team.abbreviation
          ORDER BY expected_goals_against DESC, player_name
        `,
        values,
      ),
    ]);

  return {
    skaters: skaterRows.map(mapSeriesSkater),
    goalies: goalieRows.map(mapSeriesGoalie),
    advancedSkaters: advancedSkaterRows.map(mapAdvancedSeriesSkater),
    advancedGoalies: advancedGoalieRows.map(mapAdvancedSeriesGoalie),
  };
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

function mapSeriesSkater(row: PlayoffSeriesSkaterRow): PlayoffSeriesSkaterStats {
  return {
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    nhlTeamId: row.nhl_team_id,
    teamAbbreviation: row.team_abbreviation,
    position: row.position,
    gamesPlayed: row.games_played,
    goals: row.goals,
    assists: row.assists,
    points: row.points,
    plusMinus: row.plus_minus,
    penaltyMinutes: row.penalty_minutes,
    hits: row.hits,
    powerPlayGoals: row.power_play_goals,
    shotsOnGoal: row.shots_on_goal,
    blockedShots: row.blocked_shots,
    takeaways: row.takeaways,
    giveaways: row.giveaways,
    timeOnIceSeconds: row.time_on_ice_seconds,
  };
}

function mapSeriesGoalie(row: PlayoffSeriesGoalieRow): PlayoffSeriesGoalieStats {
  return {
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    nhlTeamId: row.nhl_team_id,
    teamAbbreviation: row.team_abbreviation,
    gamesPlayed: row.games_played,
    gamesStarted: row.games_started,
    wins: row.wins,
    losses: row.losses,
    goalsAgainst: row.goals_against,
    shotsAgainst: row.shots_against,
    saves: row.saves,
    savePercentage: ratio(row.saves, row.shots_against),
    timeOnIceSeconds: row.time_on_ice_seconds,
  };
}

function mapAdvancedSeriesSkater(
  row: PlayoffSeriesAdvancedSkaterRow,
): PlayoffSeriesAdvancedSkaterStats {
  const expectedGoals = Number(row.expected_goals);
  return {
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    nhlTeamId: row.nhl_team_id,
    teamAbbreviation: row.team_abbreviation,
    shotAttempts: row.shot_attempts,
    shotsOnGoal: row.shots_on_goal,
    goals: row.goals,
    expectedGoals,
    goalsAboveExpected: row.goals - expectedGoals,
    shootingPercentage: ratio(row.goals, row.shots_on_goal),
    averageShotDistance: nullableNumber(row.average_shot_distance),
    rushAttempts: row.rush_attempts,
    reboundAttempts: row.rebound_attempts,
  };
}

function mapAdvancedSeriesGoalie(
  row: PlayoffSeriesAdvancedGoalieRow,
): PlayoffSeriesAdvancedGoalieStats {
  const expectedGoalsAgainst = Number(row.expected_goals_against);
  const saves = row.shots_against - row.goals_against;
  return {
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    nhlTeamId: row.nhl_team_id,
    teamAbbreviation: row.team_abbreviation,
    shotsAgainst: row.shots_against,
    goalsAgainst: row.goals_against,
    saves,
    expectedGoalsAgainst,
    goalsSavedAboveExpected: expectedGoalsAgainst - row.goals_against,
    savePercentage: ratio(saves, row.shots_against),
    expectedSavePercentage:
      row.shots_against > 0
        ? 1 - expectedGoalsAgainst / row.shots_against
        : null,
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

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}
