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
  record: GameTeamRecord;
  score: number | null;
  shotsOnGoal: number | null;
};

export type GameTeamRecord = {
  wins: number;
  losses: number;
  overtimeLosses: number;
};

export type LeagueTrendGame = {
  nhlGameId: number;
  gameDate: string;
  startTimeUtc: string;
  lastPeriodType: string | null;
  awayTeam: LeagueTrendTeam;
  homeTeam: LeagueTrendTeam;
};

export type LeagueTrendTeam = {
  abbreviation: string;
  score: number;
};

export type GameSkaterStats = {
  nhlPlayerId: number;
  name: string;
  sweaterNumber: number | null;
  position: string;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  penaltyMinutes: number;
  hits: number;
  powerPlayGoals: number;
  shotsOnGoal: number;
  faceoffWinPercentage: number | null;
  blockedShots: number;
  giveaways: number;
  takeaways: number;
  shifts: number;
  timeOnIceSeconds: number | null;
};

export type GameGoalieStats = {
  nhlPlayerId: number;
  name: string;
  sweaterNumber: number | null;
  starter: boolean;
  decision: string | null;
  goalsAgainst: number;
  shotsAgainst: number;
  saves: number;
  savePercentage: number | null;
  evenStrengthGoalsAgainst: number;
  evenStrengthSaves: number;
  powerPlayGoalsAgainst: number;
  powerPlaySaves: number;
  shorthandedGoalsAgainst: number;
  shorthandedSaves: number;
  timeOnIceSeconds: number | null;
};

export type GameBoxScoreTeam = GameTeamSummary & {
  skaters: GameSkaterStats[];
  goalies: GameGoalieStats[];
};

export type GameBoxScore = Omit<GameSummary, "awayTeam" | "homeTeam"> & {
  awayTeam: GameBoxScoreTeam;
  homeTeam: GameBoxScoreTeam;
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

export function formatGameTeamRecord(record: GameTeamRecord): string {
  return `${record.wins}-${record.losses}-${record.overtimeLosses}`;
}

export function formatGameState(state: string): string {
  if (state === "FUT" || state === "PRE") return "Scheduled";
  if (state === "LIVE" || state === "CRIT") return "Live";
  return state;
}
