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
  expectedGoalsPercentage: number | null;
  corsiPercentage: number | null;
  fenwickPercentage: number | null;
  expectedGoalsFor: number | null;
  expectedGoalsAgainst: number | null;
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
};

export type AdvancedGoalieLeaderboardRow = {
  player: AdvancedPlayerIdentity;
  team: TeamIdentity;
  situation: string;
  gamesPlayed: number;
  iceTimeSeconds: number;
  expectedGoalsAgainst: number | null;
  goalsAgainst: number | null;
  goalsSavedAboveExpected: number | null;
  expectedShotsOnGoalAgainst: number | null;
  shotsOnGoalAgainst: number | null;
};
