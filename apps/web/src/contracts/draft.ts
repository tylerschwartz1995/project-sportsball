export type DraftPlayerOutcome = {
  nhlPlayerId: number;
  name: string;
  position: string | null;
  birthCountry: string | null;
  draftYear: number;
  draftTeamAbbreviation: string;
  draftRound: number | null;
  draftOverallPick: number | null;
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
  trackedDraftees: number;
  playersWithNhlGames: number;
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
};
