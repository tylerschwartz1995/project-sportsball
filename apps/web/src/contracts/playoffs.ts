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
  shotsOnGoal: number | null;
};

export type PlayoffSeriesSituationAnalytics = {
  games: number;
  expectedGoalsFor: number | null;
  expectedGoalsAgainst: number | null;
  expectedGoalsShare: number | null;
  shotAttemptsFor: number | null;
  shotAttemptsAgainst: number | null;
  shotAttemptShare: number | null;
};

export type PlayoffSeriesTeamAnalytics = {
  nhlTeamId: number;
  abbreviation: string;
  name: string;
  allSituations: PlayoffSeriesSituationAnalytics | null;
  fiveOnFive: PlayoffSeriesSituationAnalytics | null;
};

export type PlayoffSeriesSkaterStats = {
  nhlPlayerId: number;
  name: string;
  nhlTeamId: number;
  teamAbbreviation: string;
  position: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  penaltyMinutes: number;
  hits: number;
  powerPlayGoals: number;
  shotsOnGoal: number;
  blockedShots: number;
  takeaways: number;
  giveaways: number;
  timeOnIceSeconds: number | null;
};

export type PlayoffSeriesGoalieStats = {
  nhlPlayerId: number;
  name: string;
  nhlTeamId: number;
  teamAbbreviation: string;
  gamesPlayed: number;
  gamesStarted: number;
  wins: number;
  losses: number;
  goalsAgainst: number;
  shotsAgainst: number;
  saves: number;
  savePercentage: number | null;
  timeOnIceSeconds: number | null;
};

export type PlayoffSeriesAdvancedSkaterStats = {
  nhlPlayerId: number;
  name: string;
  nhlTeamId: number;
  teamAbbreviation: string;
  shotAttempts: number;
  shotsOnGoal: number;
  goals: number;
  expectedGoals: number;
  goalsAboveExpected: number;
  shootingPercentage: number | null;
  averageShotDistance: number | null;
  rushAttempts: number;
  reboundAttempts: number;
};

export type PlayoffSeriesAdvancedGoalieStats = {
  nhlPlayerId: number;
  name: string;
  nhlTeamId: number;
  teamAbbreviation: string;
  shotsAgainst: number;
  goalsAgainst: number;
  saves: number;
  expectedGoalsAgainst: number;
  goalsSavedAboveExpected: number;
  savePercentage: number | null;
  expectedSavePercentage: number | null;
};

export type PlayoffSeriesPlayerStatsPackage = {
  skaters: PlayoffSeriesSkaterStats[];
  goalies: PlayoffSeriesGoalieStats[];
  advancedSkaters: PlayoffSeriesAdvancedSkaterStats[];
  advancedGoalies: PlayoffSeriesAdvancedGoalieStats[];
};

export type PlayoffSeriesInsights = {
  id: string;
  teamAnalytics: PlayoffSeriesTeamAnalytics[];
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
  teamAnalytics: PlayoffSeriesTeamAnalytics[];
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
