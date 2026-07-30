export type GameDateSummary = {
  date: string;
  gameCount: number;
};

export type GameSummary = {
  id: number;
  nhlGameId: number;
  seasonId: number;
  gameType: number;
  gameDate: string;
  startTimeUtc: string;
  state: string;
  lastPeriodType: string | null;
  awayTeam: GameTeamSummary;
  homeTeam: GameTeamSummary;
};

export type GameTeamSummary = {
  id: number;
  nhlTeamId: number;
  abbreviation: string;
  name: string;
  score: number | null;
  shotsOnGoal: number | null;
};

export function parseGameDate(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
    ? value
    : null;
}
