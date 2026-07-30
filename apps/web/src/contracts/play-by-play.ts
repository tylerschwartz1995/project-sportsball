export type PlayByPlayTeam = {
  nhlTeamId: number;
  abbreviation: string;
  name: string;
};

export type PlayByPlayPlayer = {
  sourcePlayerId: number;
  nhlPlayerId: number | null;
  name: string | null;
  role: string;
};

export type PlayByPlayEvent = {
  sourceEventId: number;
  sortOrder: number;
  periodNumber: number;
  periodType: string;
  timeInPeriod: string;
  timeInPeriodSeconds: number | null;
  timeRemaining: string;
  situationCode: string | null;
  typeCode: number;
  typeDescription: string;
  ownerTeam: PlayByPlayTeam | null;
  shotType: string | null;
  reason: string | null;
  secondaryReason: string | null;
  penaltyDescription: string | null;
  penaltyDurationMinutes: number | null;
  awayScore: number | null;
  homeScore: number | null;
  awayShotsOnGoal: number | null;
  homeShotsOnGoal: number | null;
  players: PlayByPlayPlayer[];
};

export type GamePlayByPlay = {
  nhlGameId: number;
  events: PlayByPlayEvent[];
};
