export type DraftPlayerOutcome = {
  nhlPlayerId: number | null;
  name: string;
  position: string | null;
  birthCountry: string | null;
  amateurLeague: string | null;
  amateurClubName: string | null;
  draftYear: number;
  draftTeamNhlId: number | null;
  draftTeamName: string;
  draftTeamAbbreviation: string;
  originalPickOwnerAbbreviation: string;
  pickOwnerHistory: string;
  draftRound: number;
  draftPickInRound: number;
  draftOverallPick: number;
  removedOutright: boolean;
  removedOutrightReason: string | null;
  firstSeasonId: number | null;
  lastSeasonId: number | null;
  seasonsPlayed: number;
  careerGames: number;
  careerGoals: number;
  careerAssists: number;
  careerPoints: number;
  careerWins: number;
  careerGameScore: number | null;
  careerIndividualExpectedGoals: number | null;
  careerOnIceExpectedGoalsPercentage: number | null;
  careerGoalsSavedAboveExpected: number | null;
};

export type DraftTeamPerformance = {
  teamNhlId: number | null;
  teamName: string;
  teamAbbreviation: string;
  selections: number;
  playersWithNhlGames: number;
  appearanceRate: number;
  hundredGamePlayers: number;
  hundredGameRate: number;
  totalGames: number;
  averageGames: number;
  totalPoints: number;
  totalWins: number;
  lateRoundRegulars: number;
};

export type DraftTeamOption = {
  nhlTeamId: number | null;
  name: string;
  abbreviation: string;
};

export type DraftAnalyticsOptions = {
  draftYear?: number | null;
  teamAbbreviation?: string | null;
  allYears?: boolean;
  yearRange?: boolean;
  fromYear?: number | null;
  toYear?: number | null;
  defaultYear?: "latest" | "mature";
  includeAdvanced?: boolean;
};

export type DraftAnalytics = {
  outcomes: DraftPlayerOutcome[];
  teamPerformance: DraftTeamPerformance[];
  draftYears: number[];
  teamOptions: DraftTeamOption[];
  selectedDraftYear: number | null;
  selectedFromYear: number | null;
  selectedToYear: number | null;
  latestDraftYear: number | null;
  latestMatureDraftYear: number | null;
  allYears: boolean;
};
