export type TeamIdentity = {
  id: number;
  nhlTeamId: number;
  franchiseId: number | null;
  abbreviation: string;
  name: string;
};

export type TeamSeasonStats = {
  seasonId: number;
  gameType: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  regulationWins: number;
  overtimeWins: number;
  shootoutWins: number;
  regulationLosses: number;
  overtimeLosses: number;
  shootoutLosses: number;
  standingsPoints: number;
  goalsFor: number;
  goalsAgainst: number;
  shotsFor: number;
  shotsAgainst: number;
  shootingPercentage?: number | null;
  savePercentage?: number | null;
  faceoffWinPercentage?: number | null;
  penaltyMinutes?: number | null;
  hits?: number | null;
  powerPlayPercentage?: number | null;
  penaltyKillPercentage?: number | null;
};

export type TeamSeasonSummary = {
  team: TeamIdentity;
  stats: TeamSeasonStats;
};

export type TeamSkaterSplit = {
  nhlPlayerId: number;
  name: string;
  position: string | null;
  gamesPlayed: number;
  goals: number | null;
  assists: number | null;
  points: number | null;
  plusMinus: number | null;
  penaltyMinutes: number | null;
  powerPlayPoints?: number | null;
  shots?: number | null;
};

export type TeamGoalieSplit = {
  nhlPlayerId: number;
  name: string;
  gamesPlayed: number;
  gamesStarted: number | null;
  wins: number | null;
  losses: number | null;
  overtimeLosses: number | null;
  goalsAgainstAverage: number | null;
  savePercentage: number | null;
  shutouts: number | null;
};

export type TeamSeasonDetail = {
  team: TeamIdentity;
  seasonId: number;
  regularSeason: TeamSeasonStats | null;
  playoffs: TeamSeasonStats | null;
  skaters: TeamSkaterSplit[];
  goalies: TeamGoalieSplit[];
};
