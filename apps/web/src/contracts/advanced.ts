import type { TeamIdentity } from "@/contracts/team";

export type MoneyPuckTeamSituation = {
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
  shotAttemptsFor: number | null;
  shotAttemptsAgainst: number | null;
};

export type MoneyPuckTeamSeason = {
  seasonId: number;
  team: TeamIdentity;
  situations: MoneyPuckTeamSituation[];
};

export type MoneyPuckPlayerTeam = {
  nhlTeamId: number;
  abbreviation: string;
  name: string;
};

export type MoneyPuckSkaterSituation = {
  team: MoneyPuckPlayerTeam;
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
  individualShotAttempts: number | null;
};

export type MoneyPuckGoalieSituation = {
  team: MoneyPuckPlayerTeam;
  situation: string;
  gamesPlayed: number;
  iceTimeSeconds: number;
  expectedGoalsAgainst: number | null;
  goalsAgainst: number | null;
  unblockedShotAttemptsAgainst: number | null;
  expectedShotsOnGoalAgainst: number | null;
  shotsOnGoalAgainst: number | null;
  flurryAdjustedExpectedGoalsAgainst: number | null;
};

export type MoneyPuckPlayerSeason = {
  seasonId: number;
  nhlPlayerId: number;
  skaterSituations: MoneyPuckSkaterSituation[];
  goalieSituations: MoneyPuckGoalieSituation[];
};
