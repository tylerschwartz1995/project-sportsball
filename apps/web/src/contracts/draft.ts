export type DraftPlayerOutcome = {
  nhlPlayerId: number | null;
  name: string;
  position: string | null;
  birthCountry: string | null;
  amateurLeague: string | null;
  amateurClubName: string | null;
  draftYear: number;
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
};

export type DraftTeamPerformance = {
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

export type DraftAnalytics = {
  outcomes: DraftPlayerOutcome[];
  teamPerformance: DraftTeamPerformance[];
  draftYears: number[];
  teamAbbreviations: string[];
  selectedDraftYear: number | null;
  allYears: boolean;
};
