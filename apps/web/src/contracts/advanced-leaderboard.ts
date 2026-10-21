import type { TeamIdentity } from "@/contracts/team";

export type AdvancedPlayerIdentity = {
  nhlPlayerId: number;
  name: string;
  position: string | null;
};

export type AdvancedTeamLeaderboardRow = {
  team: TeamIdentity;
  situation: string;
  gamesPlayed: number;
  iceTimeSeconds: number;
  highDangerExpectedGoalsFor?: number | null;
  highDangerExpectedGoalsAgainst?: number | null;
  highDangerExpectedGoalsPercentage?: number | null;
  expectedGoalsPercentage: number | null;
  corsiPercentage: number | null;
  fenwickPercentage: number | null;
  expectedGoalsFor: number | null;
  expectedGoalsAgainst: number | null;
  pdo?: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
};

export type AdvancedSkaterLeaderboardRow = {
  player: AdvancedPlayerIdentity;
  team: TeamIdentity;
  situation: string;
  gamesPlayed: number;
  iceTimeSeconds: number;
  gameScore: number | null;
  onIceExpectedGoalsPercentage: number | null;
  onIceCorsiPercentage: number | null;
  onIceFenwickPercentage: number | null;
  individualExpectedGoals: number | null;
  individualGoals: number | null;
  individualPoints: number | null;
  pointsPer60?: number | null;
  individualExpectedGoalsPer60?: number | null;
  onIceExpectedGoalsForPer60?: number | null;
  onIceExpectedGoalsAgainstPer60?: number | null;
  onIceHighDangerExpectedGoalsPercentage?: number | null;
};

export type AdvancedGoalieLeaderboardRow = {
  player: AdvancedPlayerIdentity;
  team: TeamIdentity;
  situation: string;
  gamesPlayed: number;
  iceTimeSeconds: number;
  expectedGoalsAgainstPer60?: number | null;
  highDangerGoalsSavedAboveExpected?: number | null;
  mediumDangerGoalsSavedAboveExpected?: number | null;
  lowDangerGoalsSavedAboveExpected?: number | null;
  reboundsPer60?: number | null;
  expectedGoalsAgainst: number | null;
  goalsAgainst: number | null;
  goalsSavedAboveExpected: number | null;
  expectedShotsOnGoalAgainst: number | null;
  shotsOnGoalAgainst: number | null;
};
