export type SeasonSummary = {
  id: number;
  startYear: number;
  endYear: number;
  label: string;
};

export function parseSeasonId(value: string | null | undefined): number | null {
  if (value === null || value === undefined || !/^\d{8}$/.test(value)) {
    return null;
  }

  const seasonId = Number(value);
  const startYear = Math.floor(seasonId / 10_000);
  const endYear = seasonId % 10_000;
  return startYear >= 1900 && endYear === startYear + 1 ? seasonId : null;
}

export function formatSeasonLabel(startYear: number, endYear: number): string {
  return `${startYear}–${String(endYear).slice(-2)}`;
}
