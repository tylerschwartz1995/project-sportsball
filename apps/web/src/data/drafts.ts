import "server-only";

import type {
  DraftAnalytics,
  DraftAnalyticsOptions,
  DraftPlayerOutcome,
  DraftTeamPerformance,
} from "@/contracts/draft";
import { query } from "@/data/database";

type DraftOutcomeRow = {
  nhl_player_id: number | null;
  player_name: string;
  position: string | null;
  birth_country: string | null;
  amateur_league: string | null;
  amateur_club_name: string | null;
  draft_year: number;
  draft_team_nhl_id: number | null;
  draft_team_name: string;
  draft_team_abbrev: string;
  original_pick_owner_abbrev: string;
  pick_owner_history: string;
  draft_round: number;
  draft_pick_in_round: number;
  draft_overall_pick: number;
  removed_outright: boolean;
  removed_outright_reason: string | null;
  first_season_id: number | null;
  last_season_id: number | null;
  seasons_played: number;
  career_games: number;
  career_goals: number;
  career_assists: number;
  career_points: number;
  career_wins: number;
  career_game_score: number | null;
  career_individual_x_goals: number | null;
  career_on_ice_x_goals_percentage: number | null;
  career_goals_saved_above_expected: number | null;
};

type DraftFilterRow = {
  draft_year: number;
  draft_team_nhl_id: number | null;
  draft_team_name: string;
  draft_team_abbrev: string;
  has_nhl_appearance: boolean;
};

const MATURE_DRAFT_LAG_YEARS = 5;
const TEAM_DRAFT_WINDOW_YEARS = 10;

export async function getDraftAnalytics(
  options: DraftAnalyticsOptions = {},
): Promise<DraftAnalytics> {
  const {
    draftYear = null,
    teamAbbreviation = null,
    allYears = false,
    yearRange = false,
    fromYear = null,
    toYear = null,
    defaultYear = "latest",
    includeAdvanced = false,
  } = options;
  const filterRows = await query<DraftFilterRow>(
    `
      SELECT
        selection.draft_year,
        team.nhl_id::integer AS draft_team_nhl_id,
        COALESCE(
          team_season.full_name,
          franchise.current_name,
          team.name,
          selection.drafting_team_abbrev
        ) AS draft_team_name,
        selection.drafting_team_abbrev AS draft_team_abbrev,
        BOOL_OR(
          EXISTS (
            SELECT 1
            FROM historical_skater_season_stats AS skater
            WHERE skater.player_id = selection.player_id
              AND skater.game_type = 2
          )
          OR EXISTS (
            SELECT 1
            FROM historical_goalie_season_stats AS goalie
            WHERE goalie.player_id = selection.player_id
              AND goalie.game_type = 2
          )
        ) AS has_nhl_appearance
      FROM draft_selections AS selection
      LEFT JOIN teams AS team
        ON team.id = selection.drafting_team_id
      LEFT JOIN franchises AS franchise
        ON franchise.id = team.franchise_id
      LEFT JOIN team_seasons AS team_season
        ON team_season.team_id = team.id
       AND team_season.season_id =
         selection.draft_year * 10000 + selection.draft_year + 1
      GROUP BY
        selection.draft_year,
        team.nhl_id,
        team.name,
        team_season.full_name,
        franchise.current_name,
        selection.drafting_team_abbrev
      ORDER BY selection.draft_year DESC, selection.drafting_team_abbrev
    `,
  );
  const draftYears = [
    ...new Set(filterRows.map((row) => row.draft_year)),
  ].sort((left, right) => right - left);
  const latestOutcomeYear = draftYears.find((year) =>
    filterRows.some(
      (row) => row.draft_year === year && row.has_nhl_appearance,
    ),
  );
  const latestDraftYear = draftYears[0] ?? null;
  const latestMatureDraftYear =
    draftYears.find(
      (year) =>
        latestDraftYear !== null &&
        year <= latestDraftYear - MATURE_DRAFT_LAG_YEARS &&
        filterRows.some(
          (row) => row.draft_year === year && row.has_nhl_appearance,
        ),
    ) ?? latestOutcomeYear ?? latestDraftYear;
  const selectedDraftYear = allYears || yearRange
    ? null
    : (draftYear ??
      (defaultYear === "mature"
        ? latestMatureDraftYear
        : latestDraftYear) ??
      null);
  const defaultRangeEnd = latestMatureDraftYear;
  const defaultRangeStart = defaultRangeEnd === null
    ? null
    : Math.max(
        draftYears.at(-1) ?? defaultRangeEnd,
        defaultRangeEnd - TEAM_DRAFT_WINDOW_YEARS + 1,
      );
  const matureDraftYears = defaultRangeEnd === null
    ? draftYears
    : draftYears.filter((year) => year <= defaultRangeEnd);
  const selectedFromYear = yearRange
    ? normalizeRangeBoundary(fromYear, defaultRangeStart, matureDraftYears)
    : null;
  const selectedToYear = yearRange
    ? normalizeRangeBoundary(toYear, defaultRangeEnd, matureDraftYears)
    : null;
  const [rangeStart, rangeEnd] = normalizeRange(
    selectedFromYear,
    selectedToYear,
  );
  const outcomeRows = await query<DraftOutcomeRow>(
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
        FROM historical_skater_season_stats AS stats
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
        FROM historical_goalie_season_stats AS stats
        WHERE stats.game_type = 2
        GROUP BY stats.player_id
      ),
      skater_advanced_career AS (
        SELECT
          stats.player_id,
          SUM(stats.game_score) FILTER (
            WHERE stats.game_score IS NOT NULL
          ) AS career_game_score,
          SUM(stats.individual_x_goals) FILTER (
            WHERE stats.individual_x_goals IS NOT NULL
          ) AS career_individual_x_goals,
          SUM(stats.on_ice_x_goals_for) FILTER (
            WHERE stats.on_ice_x_goals_for IS NOT NULL
              AND stats.on_ice_x_goals_against IS NOT NULL
          ) / NULLIF(
            SUM(
              stats.on_ice_x_goals_for + stats.on_ice_x_goals_against
            ) FILTER (
              WHERE stats.on_ice_x_goals_for IS NOT NULL
                AND stats.on_ice_x_goals_against IS NOT NULL
            ),
            0
          ) AS career_on_ice_x_goals_percentage
        FROM moneypuck_skater_season_stats AS stats
        WHERE stats.situation = 'all'
          AND $5::boolean
        GROUP BY stats.player_id
      ),
      goalie_advanced_career AS (
        SELECT
          stats.player_id,
          SUM(stats.expected_goals_against - stats.goals_against) FILTER (
            WHERE stats.expected_goals_against IS NOT NULL
              AND stats.goals_against IS NOT NULL
          ) AS career_goals_saved_above_expected
        FROM moneypuck_goalie_season_stats AS stats
        WHERE stats.situation = 'all'
          AND $5::boolean
        GROUP BY stats.player_id
      )
      SELECT
        player.nhl_id::integer AS nhl_player_id,
        selection.player_name,
        selection.position,
        selection.country_code AS birth_country,
        selection.amateur_league,
        selection.amateur_club_name,
        selection.draft_year,
        team.nhl_id::integer AS draft_team_nhl_id,
        COALESCE(
          team_season.full_name,
          franchise.current_name,
          team.name,
          selection.drafting_team_abbrev
        ) AS draft_team_name,
        selection.drafting_team_abbrev AS draft_team_abbrev,
        selection.original_pick_owner_abbrev,
        selection.pick_owner_history,
        selection.round_number AS draft_round,
        selection.pick_in_round AS draft_pick_in_round,
        selection.overall_pick_number AS draft_overall_pick,
        selection.removed_outright,
        selection.removed_outright_reason,
        LEAST(
          skater.first_season_id,
          goalie.first_season_id
        ) AS first_season_id,
        GREATEST(
          skater.last_season_id,
          goalie.last_season_id
        ) AS last_season_id,
        GREATEST(
          COALESCE(skater.seasons_played, 0),
          COALESCE(goalie.seasons_played, 0)
        )::integer AS seasons_played,
        GREATEST(
          COALESCE(skater.career_games, 0),
          COALESCE(goalie.career_games, 0)
        )::integer AS career_games,
        COALESCE(skater.career_goals, 0)::integer AS career_goals,
        COALESCE(skater.career_assists, 0)::integer AS career_assists,
        COALESCE(skater.career_points, 0)::integer AS career_points,
        COALESCE(goalie.career_wins, 0)::integer AS career_wins,
        skater_advanced.career_game_score,
        skater_advanced.career_individual_x_goals,
        skater_advanced.career_on_ice_x_goals_percentage,
        goalie_advanced.career_goals_saved_above_expected
      FROM draft_selections AS selection
      LEFT JOIN teams AS team
        ON team.id = selection.drafting_team_id
      LEFT JOIN franchises AS franchise
        ON franchise.id = team.franchise_id
      LEFT JOIN team_seasons AS team_season
        ON team_season.team_id = team.id
       AND team_season.season_id =
         selection.draft_year * 10000 + selection.draft_year + 1
      LEFT JOIN players AS player
        ON player.id = selection.player_id
      LEFT JOIN skater_career AS skater
        ON skater.player_id = selection.player_id
      LEFT JOIN goalie_career AS goalie
        ON goalie.player_id = selection.player_id
      LEFT JOIN skater_advanced_career AS skater_advanced
        ON skater_advanced.player_id = selection.player_id
      LEFT JOIN goalie_advanced_career AS goalie_advanced
        ON goalie_advanced.player_id = selection.player_id
      WHERE ($1::integer IS NULL OR selection.draft_year = $1)
        AND (
          $2::text IS NULL
          OR selection.drafting_team_abbrev = $2
        )
        AND ($3::integer IS NULL OR selection.draft_year >= $3)
        AND ($4::integer IS NULL OR selection.draft_year <= $4)
      ORDER BY
        selection.draft_year DESC,
        selection.overall_pick_number,
        selection.player_name
    `,
    [
      selectedDraftYear,
      teamAbbreviation,
      rangeStart,
      rangeEnd,
      includeAdvanced,
    ],
  );
  const outcomes = outcomeRows.map(mapOutcome);
  const teamOptions = uniqueTeamOptions(filterRows);
  return {
    outcomes,
    teamPerformance: buildTeamPerformance(outcomes),
    draftYears,
    teamOptions,
    selectedDraftYear,
    selectedFromYear: rangeStart,
    selectedToYear: rangeEnd,
    latestDraftYear,
    latestMatureDraftYear,
    allYears,
  };
}

function mapOutcome(row: DraftOutcomeRow): DraftPlayerOutcome {
  return {
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    position: row.position,
    birthCountry: row.birth_country,
    amateurLeague: row.amateur_league,
    amateurClubName: row.amateur_club_name,
    draftYear: row.draft_year,
    draftTeamNhlId: row.draft_team_nhl_id,
    draftTeamName: row.draft_team_name,
    draftTeamAbbreviation: row.draft_team_abbrev,
    originalPickOwnerAbbreviation: row.original_pick_owner_abbrev,
    pickOwnerHistory: row.pick_owner_history,
    draftRound: row.draft_round,
    draftPickInRound: row.draft_pick_in_round,
    draftOverallPick: row.draft_overall_pick,
    removedOutright: row.removed_outright,
    removedOutrightReason: row.removed_outright_reason,
    firstSeasonId: row.first_season_id,
    lastSeasonId: row.last_season_id,
    seasonsPlayed: row.seasons_played,
    careerGames: row.career_games,
    careerGoals: row.career_goals,
    careerAssists: row.career_assists,
    careerPoints: row.career_points,
    careerWins: row.career_wins,
    careerGameScore: row.career_game_score,
    careerIndividualExpectedGoals: row.career_individual_x_goals,
    careerOnIceExpectedGoalsPercentage:
      row.career_on_ice_x_goals_percentage,
    careerGoalsSavedAboveExpected:
      row.career_goals_saved_above_expected,
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
      const selections = players.length;
      const playersWithNhlGames = players.filter(
        (player) => player.careerGames > 0,
      ).length;
      const hundredGamePlayers = players.filter(
        (player) => player.careerGames >= 100,
      ).length;
      const totalGames = sum(players, (player) => player.careerGames);
      return {
        teamNhlId: players.find((player) => player.draftTeamNhlId !== null)
          ?.draftTeamNhlId ?? null,
        teamName:
          players.find((player) => player.draftTeamName)?.draftTeamName ??
          teamAbbreviation,
        teamAbbreviation,
        selections,
        playersWithNhlGames,
        appearanceRate: playersWithNhlGames / selections,
        hundredGamePlayers,
        hundredGameRate: hundredGamePlayers / selections,
        totalGames,
        averageGames: totalGames / selections,
        totalPoints: sum(players, (player) => player.careerPoints),
        totalWins: sum(players, (player) => player.careerWins),
        lateRoundRegulars: players.filter(
          (player) => player.draftRound >= 4 && player.careerGames >= 100,
        ).length,
      };
    })
    .sort(
      (left, right) =>
        right.hundredGameRate - left.hundredGameRate ||
        right.totalGames - left.totalGames ||
        left.teamAbbreviation.localeCompare(right.teamAbbreviation),
    );
}

function normalizeRangeBoundary(
  requested: number | null,
  fallback: number | null,
  draftYears: number[],
): number | null {
  if (requested !== null && draftYears.includes(requested)) {
    return requested;
  }
  return fallback;
}

function normalizeRange(
  fromYear: number | null,
  toYear: number | null,
): [number | null, number | null] {
  if (fromYear === null || toYear === null) {
    return [fromYear, toYear];
  }
  return fromYear <= toYear ? [fromYear, toYear] : [toYear, fromYear];
}

function uniqueTeamOptions(filterRows: DraftFilterRow[]) {
  const teams = new Map<
    string,
    { nhlTeamId: number | null; name: string; abbreviation: string }
  >();
  for (const row of filterRows) {
    const existing = teams.get(row.draft_team_abbrev);
    if (
      !existing ||
      (existing.nhlTeamId === null && row.draft_team_nhl_id !== null)
    ) {
      teams.set(row.draft_team_abbrev, {
        nhlTeamId: row.draft_team_nhl_id,
        name: row.draft_team_name,
        abbreviation: row.draft_team_abbrev,
      });
    }
  }
  return [...teams.values()].sort((left, right) =>
    left.name.localeCompare(right.name) ||
    left.abbreviation.localeCompare(right.abbreviation),
  );
}

function sum<T>(values: T[], getValue: (value: T) => number): number {
  return values.reduce((total, value) => total + getValue(value), 0);
}
