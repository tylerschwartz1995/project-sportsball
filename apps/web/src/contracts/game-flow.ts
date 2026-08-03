export type GameFlowTeam = {
  nhlTeamId: number;
  abbreviation: string;
  name: string;
};

export type GameFlowChance = {
  sourceShotId: string;
  team: GameFlowTeam;
  shooterName: string | null;
  shotType: string | null;
  expectedGoal: number;
  isGoal: boolean;
};

export type GameFlowPoint = {
  gameTimeSeconds: number;
  period: number;
  periodTimeSeconds: number;
  awayPressureExpectedGoals: number;
  homePressureExpectedGoals: number;
  pressureDifferential: number;
  awayCumulativeExpectedGoals: number;
  homeCumulativeExpectedGoals: number;
  awayShotsInWindow: number;
  homeShotsInWindow: number;
  awayScore: number;
  homeScore: number;
  biggestChance: GameFlowChance | null;
};

export type GameFlowGoal = {
  sourceShotId: string;
  gameTimeSeconds: number;
  period: number;
  periodTimeSeconds: number;
  team: GameFlowTeam;
  shooterName: string | null;
  assists: string[] | null;
  awayScore: number;
  homeScore: number;
};

export type GameFlowPeriodSummary = {
  period: number;
  periodType: string;
  awayExpectedGoals: number;
  homeExpectedGoals: number;
};

export type GameFlow = {
  awayTeam: GameFlowTeam;
  homeTeam: GameFlowTeam;
  points: GameFlowPoint[];
  goals: GameFlowGoal[];
  periods: GameFlowPeriodSummary[];
  gameEndSeconds: number;
  pressureWindowSeconds: number;
  endedInShootout: boolean;
};
