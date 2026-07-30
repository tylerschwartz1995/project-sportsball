import type { PlayerProfile } from "@/contracts/player";
import type { TeamIdentity } from "@/contracts/team";

export type GameLogTeam = {
  nhlTeamId: number;
  abbreviation: string;
  name: string;
};

export type GameResult = "W" | "L" | "OTL";

export type TeamGameLogEntry = {
  nhlGameId: number;
  gameDate: string;
  gameType: number;
  lastPeriodType: string | null;
  isHome: boolean;
  opponent: GameLogTeam;
  score: number;
  opponentScore: number;
  result: GameResult;
  shotsOnGoal: number | null;
  opponentShotsOnGoal: number | null;
  fiveOnFiveXGoalsPercentage: number | null;
  fiveOnFiveXGoalsFor: number | null;
  fiveOnFiveXGoalsAgainst: number | null;
};

export type TeamGameLog = {
  team: TeamIdentity;
  seasonId: number;
  games: TeamGameLogEntry[];
};

export type PlayerGameLogEntryBase = {
  nhlGameId: number;
  gameDate: string;
  gameType: number;
  isHome: boolean;
  team: GameLogTeam;
  opponent: GameLogTeam;
  teamScore: number | null;
  opponentScore: number | null;
};

export type SkaterGameLogEntry = PlayerGameLogEntryBase & {
  kind: "skater";
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  penaltyMinutes: number;
  shotsOnGoal: number;
  hits: number;
  blockedShots: number;
  timeOnIceSeconds: number | null;
  gameScore: number | null;
  individualXGoals: number | null;
  onIceXGoalsPercentage: number | null;
};

export type GoalieGameLogEntry = PlayerGameLogEntryBase & {
  kind: "goalie";
  starter: boolean;
  decision: string | null;
  goalsAgainst: number;
  shotsAgainst: number;
  saves: number;
  savePercentage: number | null;
  timeOnIceSeconds: number | null;
  expectedGoalsAgainst: number | null;
  goalsSavedAboveExpected: number | null;
};

export type PlayerGameLog = {
  profile: PlayerProfile;
  seasonId: number;
  skaterGames: SkaterGameLogEntry[];
  goalieGames: GoalieGameLogEntry[];
};
