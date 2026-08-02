export type PlayoffBracketTeam = {
  nhlTeamId: number;
  name: string;
  abbreviation: string;
  seedLabel: string | null;
};

export type PlayoffSeriesGameTeam = {
  nhlTeamId: number;
  abbreviation: string;
  name: string;
  score: number | null;
};

export type PlayoffSeriesGame = {
  nhlGameId: number;
  gameDate: string;
  startTimeUtc: string;
  state: string;
  lastPeriodType: string | null;
  awayTeam: PlayoffSeriesGameTeam;
  homeTeam: PlayoffSeriesGameTeam;
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
  games: PlayoffSeriesGame[];
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
