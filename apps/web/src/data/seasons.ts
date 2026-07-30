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
  const rows = await query<SeasonRow>(`
    SELECT id, start_year, end_year
    FROM seasons
    ORDER BY id DESC
  `);

  return rows.map((row) => ({
    id: row.id,
    startYear: row.start_year,
    endYear: row.end_year,
    label: formatSeasonLabel(row.start_year, row.end_year),
  }));
}
