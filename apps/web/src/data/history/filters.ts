import type {
  HistoryFilterOptions
} from "@/contracts/history";
import { query } from "@/data/database";
import { teamAbbreviations } from "@/lib/team-abbreviations";
import "server-only";
export async function getHistoryFilterOptions(
  gameType: number,
): Promise<HistoryFilterOptions> {
  const [positionRows, teamRows, countryRows, historicalNames] = await Promise.all([
    query<{ value: string }>(`
      SELECT DISTINCT player.position AS value
      FROM historical_skater_season_stats AS stats
      JOIN players AS player ON player.id = stats.player_id
      WHERE stats.game_type = $1
        AND player.position IS NOT NULL
      ORDER BY value
    `, [gameType]),
    query<{ value: string; label: string }>(`
      SELECT DISTINCT TRIM(team_abbrev) AS value,
        COALESCE(identity.full_name, TRIM(team_abbrev)) AS label
      FROM (
        SELECT team_abbrevs FROM historical_skater_season_stats WHERE game_type = $1
        UNION ALL
        SELECT team_abbrevs FROM historical_goalie_season_stats WHERE game_type = $1
      ) AS stats
      CROSS JOIN LATERAL unnest(
        regexp_split_to_array(COALESCE(stats.team_abbrevs, ''), ',\\s*')
      ) AS team_abbrev
      LEFT JOIN (
        SELECT DISTINCT ON (abbreviation) abbreviation, full_name
        FROM team_seasons
        ORDER BY abbreviation, season_id DESC
      ) AS identity ON identity.abbreviation = TRIM(team_abbrev)
      WHERE TRIM(team_abbrev) <> ''
      ORDER BY value
    `, [gameType]),
    query<{ value: string }>(`
      SELECT DISTINCT player.birth_country AS value
      FROM (
        SELECT player_id FROM historical_skater_season_stats WHERE game_type = $1
        UNION
        SELECT player_id FROM historical_goalie_season_stats WHERE game_type = $1
      ) AS stats
      JOIN players AS player ON player.id = stats.player_id
      WHERE player.birth_country IS NOT NULL
      ORDER BY value
    `, [gameType]),
    query<{ nhl_team_id: number; team_name: string }>(`
      SELECT DISTINCT ON (nhl_team_id) nhl_team_id, team_name
      FROM historical_team_season_stats
      ORDER BY nhl_team_id, season_id DESC
    `),
  ]);
  return {
    positions: positionRows.map((row) => row.value),
    teams: teamRows.map((row) => row.value),
    teamNames: {
      ...Object.fromEntries(historicalNames
        .filter(row => teamAbbreviations[row.nhl_team_id])
        .map(row => [teamAbbreviations[row.nhl_team_id], row.team_name])),
      ...Object.fromEntries(teamRows.filter(row => row.label !== row.value).map(row => [row.value, row.label])),
    },
    countries: countryRows.map((row) => row.value),
  };
}
