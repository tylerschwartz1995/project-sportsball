import "server-only";

import type {
  DraftAnalytics,
  DraftPlayerOutcome,
  DraftTeamPerformance,
} from "@/contracts/draft";
import { query } from "@/data/database";

type DraftOutcomeRow = {
  nhl_player_id: number;
  player_name: string;
  position: string | null;
  birth_country: string | null;
  draft_year: number;
  draft_team_abbrev: string;
  draft_round: number | null;
  draft_overall_pick: number | null;
  first_season_id: number | null;
  last_season_id: number | null;
  seasons_played: number;
  career_games: number;
  career_goals: number;
  career_assists: number;
  career_points: number;
  career_wins: number;
};

type DraftFilterRow = {
  draft_year: number | null;
  draft_team_abbrev: string | null;
};

export async function getDraftAnalytics(
  draftYear: number | null = null,
  teamAbbreviation: string | null = null,
): Promise<DraftAnalytics> {
  const [outcomeRows, filterRows] = await Promise.all([
    query<DraftOutcomeRow>(
      `
        WITH skater_career AS (
          SELECT
            stats.player_id,
            MIN(stats.season_id)::integer AS first_season_id,
            MAX(stats.season_id)::integer AS last_season_id,
            COUNT(DISTINCT stats.season_id)::integer AS seasons_played,
            SUM(stats.games_played)::integer AS career_games,
            SUM(stats.goals)::integer AS career_goals,
            SUM(stats.assists)::integer AS career_assists,
            SUM(stats.points)::integer AS career_points
          FROM skater_season_stats AS stats
          WHERE stats.game_type = 2
          GROUP BY stats.player_id
        ),
        goalie_career AS (
          SELECT
            stats.player_id,
            MIN(stats.season_id)::integer AS first_season_id,
            MAX(stats.season_id)::integer AS last_season_id,
            COUNT(DISTINCT stats.season_id)::integer AS seasons_played,
            SUM(stats.games_played)::integer AS career_games,
            SUM(stats.wins)::integer AS career_wins
          FROM goalie_season_stats AS stats
          WHERE stats.game_type = 2
          GROUP BY stats.player_id
        )
        SELECT
          player.nhl_id::integer AS nhl_player_id,
          player.display_name AS player_name,
          player.position,
          player.birth_country,
          player.draft_year,
          player.draft_team_abbrev,
          player.draft_round,
          player.draft_overall_pick,
          COALESCE(
            skater.first_season_id,
            goalie.first_season_id
          ) AS first_season_id,
          COALESCE(
            skater.last_season_id,
            goalie.last_season_id
          ) AS last_season_id,
          GREATEST(
            COALESCE(skater.seasons_played, 0),
            COALESCE(goalie.seasons_played, 0)
          )::integer AS seasons_played,
          (
            COALESCE(skater.career_games, 0) +
            COALESCE(goalie.career_games, 0)
          )::integer AS career_games,
          COALESCE(skater.career_goals, 0)::integer AS career_goals,
          COALESCE(skater.career_assists, 0)::integer AS career_assists,
          COALESCE(skater.career_points, 0)::integer AS career_points,
          COALESCE(goalie.career_wins, 0)::integer AS career_wins
        FROM players AS player
        LEFT JOIN skater_career AS skater
          ON skater.player_id = player.id
        LEFT JOIN goalie_career AS goalie
          ON goalie.player_id = player.id
        WHERE player.draft_year BETWEEN 2005 AND 2025
          AND player.draft_team_abbrev IS NOT NULL
          AND ($1::integer IS NULL OR player.draft_year = $1)
          AND (
            $2::text IS NULL
            OR player.draft_team_abbrev = $2
          )
        ORDER BY
          player.draft_year DESC,
          player.draft_overall_pick NULLS LAST,
          player.display_name
      `,
      [draftYear, teamAbbreviation],
    ),
    query<DraftFilterRow>(
      `
        SELECT DISTINCT
          draft_year,
          draft_team_abbrev
        FROM players
        WHERE draft_year BETWEEN 2005 AND 2025
          AND draft_team_abbrev IS NOT NULL
        ORDER BY draft_year DESC, draft_team_abbrev
      `,
    ),
  ]);

  const outcomes = outcomeRows.map(mapOutcome);
  return {
    outcomes,
    teamPerformance: buildTeamPerformance(outcomes),
    draftYears: [
      ...new Set(
        filterRows
          .map((row) => row.draft_year)
          .filter((value): value is number => value !== null),
      ),
    ].sort((left, right) => right - left),
    teamAbbreviations: [
      ...new Set(
        filterRows
          .map((row) => row.draft_team_abbrev)
          .filter((value): value is string => Boolean(value)),
      ),
    ].sort(),
  };
}

function mapOutcome(row: DraftOutcomeRow): DraftPlayerOutcome {
  return {
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    position: row.position,
    birthCountry: row.birth_country,
    draftYear: row.draft_year,
    draftTeamAbbreviation: row.draft_team_abbrev,
    draftRound: row.draft_round,
    draftOverallPick: row.draft_overall_pick,
    firstSeasonId: row.first_season_id,
    lastSeasonId: row.last_season_id,
    seasonsPlayed: row.seasons_played,
    careerGames: row.career_games,
    careerGoals: row.career_goals,
    careerAssists: row.career_assists,
    careerPoints: row.career_points,
    careerWins: row.career_wins,
  };
}

function buildTeamPerformance(
  outcomes: DraftPlayerOutcome[],
): DraftTeamPerformance[] {
  const teams = new Map<string, DraftPlayerOutcome[]>();
  for (const outcome of outcomes) {
    teams.set(outcome.draftTeamAbbreviation, [
      ...(teams.get(outcome.draftTeamAbbreviation) ?? []),
      outcome,
    ]);
  }

  return [...teams.entries()]
    .map(([teamAbbreviation, players]) => {
      const playersWithNhlGames = players.filter(
        (player) => player.careerGames > 0,
      );
      const totalGames = sum(players, (player) => player.careerGames);
      return {
        teamAbbreviation,
        trackedDraftees: players.length,
        playersWithNhlGames: playersWithNhlGames.length,
        totalGames,
        averageGames:
          playersWithNhlGames.length === 0
            ? 0
            : totalGames / playersWithNhlGames.length,
        totalPoints: sum(players, (player) => player.careerPoints),
        totalWins: sum(players, (player) => player.careerWins),
        lateRoundRegulars: players.filter(
          (player) =>
            (player.draftRound ?? 0) >= 4 &&
            player.careerGames >= 100,
        ).length,
      };
    })
    .sort(
      (left, right) =>
        right.totalGames - left.totalGames ||
        left.teamAbbreviation.localeCompare(right.teamAbbreviation),
    );
}

function sum<T>(values: T[], getValue: (value: T) => number): number {
  return values.reduce((total, value) => total + getValue(value), 0);
}
