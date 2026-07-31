import "server-only";

import {
  formatSeasonLabel,
  type SeasonSummary,
} from "@/contracts/season";
import { query } from "@/data/database";

type SeasonRow = {
  id: number;
  start_year: number;
  end_year: number;
};

export async function listSeasons(): Promise<SeasonSummary[]> {
  return listSeasonsWith("team_season_stats");
}

export async function listScheduleSeasons(): Promise<SeasonSummary[]> {
  return listSeasonsWith("games");
}

async function listSeasonsWith(table: "team_season_stats" | "games") {
  const rows = await query<SeasonRow>(`
    SELECT season.id, season.start_year, season.end_year
    FROM seasons AS season
    WHERE EXISTS (
      SELECT 1 FROM ${table} AS available
      WHERE available.season_id = season.id
    )
    ORDER BY season.id DESC
  `);

  return rows.map((row) => ({
    id: row.id,
    startYear: row.start_year,
    endYear: row.end_year,
    label: formatSeasonLabel(row.start_year, row.end_year),
  }));
}
