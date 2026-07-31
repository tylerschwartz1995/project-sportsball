export type PlayerProfile = {
  id: number;
  nhlPlayerId: number;
  name: string;
  position: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  heightInInches: number | null;
  weightInPounds: number | null;
  shootsCatches: string | null;
  isActive: boolean | null;
  sweaterNumber: number | null;
  draftYear: number | null;
  draftTeamAbbreviation: string | null;
  draftRound: number | null;
  draftOverallPick: number | null;
};

export type SkaterSeasonSummary = {
  kind: "skater";
  nhlPlayerId: number;
  name: string;
  position: string | null;
  birthCity: string | null;
  birthStateProvince: string | null;
  birthCountry: string | null;
  seasonId: number;
  gameType: number;
  gamesPlayed: number;
  teamsPlayedFor: number;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  penaltyMinutes: number;
  powerPlayGoals: number;
  shotsOnGoal: number;
  hits: number;
  blockedShots: number;
  timeOnIceSeconds: number | null;
};

export type GoalieSeasonSummary = {
  kind: "goalie";
  nhlPlayerId: number;
  name: string;
  position: string | null;
  birthCity: string | null;
  birthStateProvince: string | null;
  birthCountry: string | null;
  seasonId: number;
  gameType: number;
  gamesPlayed: number;
  teamsPlayedFor: number;
  gamesStarted: number;
  wins: number;
  losses: number;
  overtimeLosses: number;
  goalsAgainst: number;
  shotsAgainst: number;
  saves: number;
  savePercentage: number | null;
  timeOnIceSeconds: number;
};

export type PlayerSeasonIndex = {
  seasonId: number;
  skaters: SkaterSeasonSummary[];
  goalies: GoalieSeasonSummary[];
};

export type PlayerDetail = {
  profile: PlayerProfile;
  skaterSeasons: SkaterSeasonSummary[];
  goalieSeasons: GoalieSeasonSummary[];
};
