import type { TeamIdentity } from "@/contracts/team";

export type MoneyPuckSeasonUnitType = "line" | "pairing";

export type MoneyPuckSeasonUnitPlayer = {
  nhlPlayerId: number;
  name: string;
};

export type MoneyPuckSeasonUnitStats = {
  seasonId: number;
  team: TeamIdentity;
  players: MoneyPuckSeasonUnitPlayer[];
  unitType: MoneyPuckSeasonUnitType;
  gamesPlayed: number;
  iceTimeSeconds: number;
  expectedGoalsPercentage: number | null;
  corsiPercentage: number | null;
  expectedGoalsFor: number | null;
  expectedGoalsAgainst: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  shotsOnGoalFor: number | null;
  shotsOnGoalAgainst: number | null;
  highDangerExpectedGoalsFor: number | null;
  highDangerExpectedGoalsAgainst: number | null;
};

export type MoneyPuckSeasonUnitLeaders = {
  forwardLines: MoneyPuckSeasonUnitStats[];
  defensivePairings: MoneyPuckSeasonUnitStats[];
};
