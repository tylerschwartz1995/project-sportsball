export type StandingsEntry = {
  snapshotDate: string;
  seasonId: number;
  teamId: number;
  nhlTeamId: number;
  teamAbbreviation: string;
  teamName: string;
  conferenceName: string | null;
  divisionName: string | null;
  gamesPlayed: number;
  wins: number;
  losses: number;
  overtimeLosses: number;
  points: number;
  regulationWins: number;
  regulationPlusOvertimeWins: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifferential: number;
  pointPercentage: number;
  leagueRank: number;
  conferenceRank: number | null;
  divisionRank: number | null;
  wildcardRank: number | null;
  clinchIndicator: string | null;
};

export type StandingsPointsHistoryPoint = {
  gameDate: string;
  nhlGameId: number;
  nhlTeamId: number;
  teamAbbreviation: string;
  teamName: string;
  gamesPlayed: number;
  points: number;
};
