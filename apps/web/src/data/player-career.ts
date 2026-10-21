import "server-only";
import { query } from "@/data/database";

export type CareerSeason = {
  seasonId: number;
  gameType: number;
  kind: "skater" | "goalie";
  teams: string | null;
  games: number;
  goals: number | null;
  assists: number | null;
  points: number | null;
  wins: number | null;
  saves: number | null;
  shotsAgainst: number | null;
  plusMinus?: number | null;
  shots?: number | null;
  powerPlayPoints?: number | null;
  hits?: number | null;
  penaltyMinutes?: number | null;
  losses?: number | null;
  overtimeLosses?: number | null;
  goalsAgainstAverage?: number | null;
  savePercentage?: number | null;
  shutouts?: number | null;
  goalsAgainst?: number | null;
  timeOnIceSeconds?: number | null;
  advancedSeconds?: number | null;
  advancedPoints?: number | null;
  advancedIndividualXGoals?: number | null;
  advancedXGoalsFor?: number | null;
  advancedXGoalsAgainst?: number | null;
  advancedGoalsAgainst?: number | null;
  pointsPer60?: number | null;
  individualXGoalsPer60?: number | null;
  xGoalsPercentage?: number | null;
  goalsSavedPer60?: number | null;
  xGoalsAgainstPer60?: number | null;
};

/** NHL summary totals are already combined across teams; never add detailed splits. */
export async function getPlayerCareer(nhlPlayerId: number): Promise<CareerSeason[]> {
  return query<CareerSeason>(`
    SELECT stats.season_id AS "seasonId", stats.game_type AS "gameType",
      'skater' AS kind, stats.team_abbrevs AS teams, stats.games_played AS games,
      stats.goals, stats.assists, stats.points,
      NULL::integer AS wins, NULL::integer AS saves, NULL::integer AS "shotsAgainst",
      stats.plus_minus AS "plusMinus", stats.shots, stats.power_play_points AS "powerPlayPoints",
      stats.penalty_minutes AS "penaltyMinutes", NULL::integer AS losses,
      NULL::integer AS "overtimeLosses", NULL::double precision AS "goalsAgainstAverage",
      NULL::double precision AS "savePercentage", NULL::integer AS shutouts,
      NULL::integer AS "goalsAgainst", NULL::double precision AS "timeOnIceSeconds"
    FROM historical_skater_season_stats stats
    JOIN players player ON player.id = stats.player_id
    WHERE player.nhl_id = $1
    UNION ALL
    SELECT stats.season_id, stats.game_type, 'goalie', stats.team_abbrevs,
      stats.games_played, NULL, NULL, NULL, stats.wins, stats.saves, stats.shots_against,
      NULL, NULL, NULL, NULL, stats.losses, stats.overtime_losses,
      stats.goals_against_average, stats.save_percentage, stats.shutouts,
      stats.goals_against, stats.time_on_ice_seconds
    FROM historical_goalie_season_stats stats
    JOIN players player ON player.id = stats.player_id
    WHERE player.nhl_id = $1
    ORDER BY "seasonId" DESC, "gameType"
  `, [nhlPlayerId]);
}

/** Combine team splits using underlying counts and seconds, never average percentages. */
export async function getPlayerCareerAdvanced(nhlPlayerId: number) {
  return query<Pick<CareerSeason, "seasonId" | "kind" | "pointsPer60" | "individualXGoalsPer60" | "xGoalsPercentage" | "goalsSavedPer60" | "xGoalsAgainstPer60" | "advancedSeconds" | "advancedPoints" | "advancedIndividualXGoals" | "advancedXGoalsFor" | "advancedXGoalsAgainst" | "advancedGoalsAgainst">>(`
    SELECT stats.season_id AS "seasonId", 'skater' AS kind,
      CASE WHEN count(*) = count(individual_points) THEN sum(individual_points) * 3600.0 / NULLIF(sum(ice_time_seconds),0) END AS "pointsPer60",
      CASE WHEN count(*) = count(individual_x_goals) THEN sum(individual_x_goals) * 3600.0 / NULLIF(sum(ice_time_seconds),0) END AS "individualXGoalsPer60",
      CASE WHEN count(*) = count(on_ice_x_goals_for) AND count(*) = count(on_ice_x_goals_against)
        THEN sum(on_ice_x_goals_for) / NULLIF(sum(on_ice_x_goals_for) + sum(on_ice_x_goals_against),0) END AS "xGoalsPercentage",
      NULL::double precision AS "goalsSavedPer60", NULL::double precision AS "xGoalsAgainstPer60",
      sum(ice_time_seconds)::double precision AS "advancedSeconds",
      CASE WHEN count(*) = count(individual_points) THEN sum(individual_points)::double precision END AS "advancedPoints",
      CASE WHEN count(*) = count(individual_x_goals) THEN sum(individual_x_goals) END AS "advancedIndividualXGoals",
      CASE WHEN count(*) = count(on_ice_x_goals_for) THEN sum(on_ice_x_goals_for) END AS "advancedXGoalsFor",
      CASE WHEN count(*) = count(on_ice_x_goals_against) THEN sum(on_ice_x_goals_against) END AS "advancedXGoalsAgainst",
      NULL::double precision AS "advancedGoalsAgainst"
    FROM moneypuck_skater_season_stats stats JOIN players player ON player.id = stats.player_id
    WHERE player.nhl_id = $1 AND stats.situation = '5on5' GROUP BY stats.season_id
    UNION ALL
    SELECT stats.season_id, 'goalie', NULL, NULL, NULL,
      CASE WHEN count(*) = count(expected_goals_against) AND count(*) = count(goals_against)
        THEN (sum(expected_goals_against) - sum(goals_against)) * 3600.0 / NULLIF(sum(ice_time_seconds),0) END,
      CASE WHEN count(*) = count(expected_goals_against)
        THEN sum(expected_goals_against) * 3600.0 / NULLIF(sum(ice_time_seconds),0) END,
      sum(ice_time_seconds)::double precision, NULL, NULL, NULL,
      CASE WHEN count(*) = count(expected_goals_against) THEN sum(expected_goals_against) END,
      CASE WHEN count(*) = count(goals_against) THEN sum(goals_against)::double precision END
    FROM moneypuck_goalie_season_stats stats JOIN players player ON player.id = stats.player_id
    WHERE player.nhl_id = $1 AND stats.situation = 'all' GROUP BY stats.season_id
  `, [nhlPlayerId]);
}
