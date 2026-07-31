export type PlayoffBracketTeam = {
  nhlTeamId: number;
  name: string;
  abbreviation: string;
  seedLabel: string | null;
};

export type PlayoffSeries = {
  id: string;
  round: number;
  matchup: number;
  teamOne: PlayoffBracketTeam | null;
  teamTwo: PlayoffBracketTeam | null;
  teamOneWins: number;
  teamTwoWins: number;
  winnerNhlTeamId: number | null;
};

export type PlayoffRound = {
  round: number;
  name: string;
  series: PlayoffSeries[];
};

export type PlayoffScoringLeader = {
  nhlPlayerId: number;
  name: string;
  teamAbbreviation: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
};
