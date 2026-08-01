import type { TeamIdentity } from "@/contracts/team";

export type MoneyPuckSeasonUnitType = "line" | "pairing";

export type MoneyPuckSeasonUnitPlayer = {
  nhlPlayerId: number;
  name: string;
};

export type MoneyPuckSeasonUnitStats = {
  seasonId: number;
  unitKey: string;
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

export type MoneyPuckUnitGameStats = {
  nhlGameId: number;
  gameDate: string;
  isHome: boolean;
  opponent: TeamIdentity;
  teamScore: number | null;
  opponentScore: number | null;
  iceTimeSeconds: number;
  expectedGoalsPercentage: number | null;
  corsiPercentage: number | null;
  expectedGoalsFor: number | null;
  expectedGoalsAgainst: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  shotsOnGoalFor: number | null;
  shotsOnGoalAgainst: number | null;
};

export type MoneyPuckUnitDetail = {
  seasonId: number;
  unitKey: string;
  unitType: MoneyPuckSeasonUnitType;
  team: TeamIdentity;
  players: MoneyPuckSeasonUnitPlayer[];
  games: MoneyPuckUnitGameStats[];
};

export type MoneyPuckSeasonUnitLeaders = {
  forwardLines: MoneyPuckSeasonUnitStats[];
  defensivePairings: MoneyPuckSeasonUnitStats[];
};
