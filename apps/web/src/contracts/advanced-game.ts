export type MoneyPuckGameTeam = {
  nhlTeamId: number;
  abbreviation: string;
  name: string;
};

export type MoneyPuckGamePlayer = {
  nhlPlayerId: number;
  name: string;
};

export type MoneyPuckGameContext = {
  nhlGameId: number;
  seasonId: number;
  gameType: number;
  gameDate: string;
  awayTeam: MoneyPuckGameTeam;
  homeTeam: MoneyPuckGameTeam;
};

export type MoneyPuckTeamGameSituation = {
  team: MoneyPuckGameTeam;
  opponent: MoneyPuckGameTeam;
  situation: string;
  isHome: boolean;
  playoffGame: boolean;
  iceTimeSeconds: number;
  expectedGoalsPercentage: number | null;
  corsiPercentage: number | null;
  fenwickPercentage: number | null;
  expectedGoalsFor: number | null;
  expectedGoalsAgainst: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  shotsOnGoalFor: number | null;
  shotsOnGoalAgainst: number | null;
  shotAttemptsFor: number | null;
  shotAttemptsAgainst: number | null;
  highDangerExpectedGoalsFor: number | null;
  highDangerExpectedGoalsAgainst: number | null;
};

export type MoneyPuckSkaterGameSituation = {
  player: MoneyPuckGamePlayer;
  team: MoneyPuckGameTeam;
  opponent: MoneyPuckGameTeam;
  position: string | null;
  situation: string;
  isHome: boolean;
  iceTimeSeconds: number;
  shifts: number | null;
  gameScore: number | null;
  onIceExpectedGoalsPercentage: number | null;
  onIceCorsiPercentage: number | null;
  onIceFenwickPercentage: number | null;
  individualExpectedGoals: number | null;
  individualGoals: number | null;
  individualPoints: number | null;
  individualShotAttempts: number | null;
  primaryAssists: number | null;
  secondaryAssists: number | null;
  shotsOnGoal: number | null;
  hits: number | null;
  takeaways: number | null;
  giveaways: number | null;
  onIceExpectedGoalsFor: number | null;
  onIceExpectedGoalsAgainst: number | null;
};

export type MoneyPuckGoalieGameSituation = {
  player: MoneyPuckGamePlayer;
  team: MoneyPuckGameTeam;
  opponent: MoneyPuckGameTeam;
  situation: string;
  isHome: boolean;
  iceTimeSeconds: number;
  expectedGoalsAgainst: number | null;
  goalsAgainst: number | null;
  shotsOnGoalAgainst: number | null;
  expectedShotsOnGoalAgainst: number | null;
  expectedRebounds: number | null;
  rebounds: number | null;
  expectedFreezes: number | null;
  freezes: number | null;
  lowDangerExpectedGoalsAgainst: number | null;
  mediumDangerExpectedGoalsAgainst: number | null;
  highDangerExpectedGoalsAgainst: number | null;
};

export type MoneyPuckShot = {
  sourceShotId: string;
  sourceEventIndex: number;
  shootingTeam: MoneyPuckGameTeam;
  defendingTeam: MoneyPuckGameTeam;
  shooter: MoneyPuckGamePlayer | null;
  goalie: MoneyPuckGamePlayer | null;
  eventType: string;
  period: number;
  gameTimeSeconds: number;
  isHomeTeam: boolean;
  isPlayoffGame: boolean;
  isGoal: boolean;
  wasOnGoal: boolean;
  shotType: string | null;
  location: string | null;
  xCoordinate: number | null;
  yCoordinate: number | null;
  adjustedXCoordinate: number | null;
  adjustedYCoordinate: number | null;
  shotDistance: number | null;
  shotAngle: number | null;
  expectedGoal: number | null;
  expectedRebound: number | null;
  generatedRebound: boolean;
  wasRebound: boolean;
  wasRush: boolean;
  wasOffWing: boolean;
  wasEmptyNet: boolean;
  homeSkatersOnIce: number | null;
  awaySkatersOnIce: number | null;
  homeTeamGoals: number | null;
  awayTeamGoals: number | null;
  timeSinceLastEvent: number | null;
  distanceFromLastEvent: number | null;
};

export type MoneyPuckUnitType = "line" | "pairing";

export type MoneyPuckGameUnit = {
  sourceLineId: string;
  name: string;
  unitType: MoneyPuckUnitType;
  team: MoneyPuckGameTeam;
  opponent: MoneyPuckGameTeam;
  players: MoneyPuckGamePlayer[];
  situation: string;
  isHome: boolean;
  iceTimeSeconds: number;
  iceTimeRank: number | null;
  expectedGoalsPercentage: number | null;
  corsiPercentage: number | null;
  fenwickPercentage: number | null;
  expectedGoalsFor: number | null;
  expectedGoalsAgainst: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  shotsOnGoalFor: number | null;
  shotsOnGoalAgainst: number | null;
  highDangerExpectedGoalsFor: number | null;
  highDangerExpectedGoalsAgainst: number | null;
};

export type MoneyPuckGameAnalytics = {
  game: MoneyPuckGameContext;
  teamSituations: MoneyPuckTeamGameSituation[];
  skaterSituations: MoneyPuckSkaterGameSituation[];
  goalieSituations: MoneyPuckGoalieGameSituation[];
  shots: MoneyPuckShot[];
  forwardLines: MoneyPuckGameUnit[];
  defensivePairings: MoneyPuckGameUnit[];
};
