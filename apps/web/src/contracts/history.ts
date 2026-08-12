export type HistoryView = "skaters" | "goalies" | "teams";

export type HistorySection =
  | "overview"
  | "careers"
  | "seasons"
  | "peaks"
  | "eras";

export type HistoryDisplay = "career" | "seasons";

export type SkaterHistoryMetric =
  | "points"
  | "goals"
  | "assists"
  | "games"
  | "pointsPerGame";
export type GoalieHistoryMetric =
  | "wins"
  | "games"
  | "shutouts"
  | "savePercentage";
export type TeamHistoryMetric = "points" | "wins" | "pointPercentage";
export type HistoryMetric =
  | SkaterHistoryMetric
  | GoalieHistoryMetric
  | TeamHistoryMetric;

export type HistoricalSkaterCareer = {
  rank?: number;
  nhlPlayerId: number;
  name: string;
  position: string | null;
  seasonsPlayed: number;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  pointsPerGame: number;
};

export type HistoricalSkaterSeason = Omit<
  HistoricalSkaterCareer,
  "seasonsPlayed"
> & {
  seasonId: number;
  gameType: number;
  teamAbbreviations: string | null;
};

export type HistoricalGoalieCareer = {
  rank?: number;
  nhlPlayerId: number;
  name: string;
  seasonsPlayed: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  shutouts: number;
  savePercentage: number | null;
};

export type HistoricalGoalieSeason = Omit<
  HistoricalGoalieCareer,
  "seasonsPlayed"
> & {
  seasonId: number;
  gameType: number;
  teamAbbreviations: string | null;
  goalsAgainstAverage: number | null;
  savePercentage: number | null;
};

export type HistoricalTeamCareer = {
  rank?: number;
  nhlTeamId: number;
  name: string;
  seasonsPlayed: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  overtimeLosses: number;
  points: number;
  pointPercentage: number | null;
};

export type HistoricalTeamSeason = Omit<
  HistoricalTeamCareer,
  "seasonsPlayed" | "pointPercentage"
> & {
  seasonId: number;
  gameType: number;
  pointPercentage: number | null;
  goalsFor: number;
  goalsAgainst: number;
};

export type HistoricalSkaterLeaders = {
  view: "skaters";
  metric: SkaterHistoryMetric;
  careers: HistoricalSkaterCareer[];
  seasons: HistoricalSkaterSeason[];
};

export type HistoricalGoalieLeaders = {
  view: "goalies";
  metric: GoalieHistoryMetric;
  careers: HistoricalGoalieCareer[];
  seasons: HistoricalGoalieSeason[];
};

export type HistoricalTeamLeaders = {
  view: "teams";
  metric: TeamHistoryMetric;
  careers: HistoricalTeamCareer[];
  seasons: HistoricalTeamSeason[];
};

export type HistoricalLeaders =
  | HistoricalSkaterLeaders
  | HistoricalGoalieLeaders
  | HistoricalTeamLeaders;

export type HistoryFilters = {
  startYear: number;
  endYear: number;
  minimumGames: number;
  position: string | null;
  team: string | null;
  country: string | null;
};

export type HistoryFilterOptions = {
  positions: string[];
  teams: string[];
  countries: string[];
};

export type HistoricalLeaderboard =
  | {
      view: "skaters";
      display: HistoryDisplay;
      metric: SkaterHistoryMetric;
      rows: Array<HistoricalSkaterCareer | HistoricalSkaterSeason>;
      totalRows: number;
    }
  | {
      view: "goalies";
      display: HistoryDisplay;
      metric: GoalieHistoryMetric;
      rows: Array<HistoricalGoalieCareer | HistoricalGoalieSeason>;
      totalRows: number;
    }
  | {
      view: "teams";
      display: HistoryDisplay;
      metric: TeamHistoryMetric;
      rows: Array<HistoricalTeamCareer | HistoricalTeamSeason>;
      totalRows: number;
    };

export type HistoryRecordProgressionPoint = {
  seasonId: number;
  nhlPlayerId: number;
  name: string;
  metric: "points" | "goals" | "assists";
  value: number;
};

export type HistoryLeagueTrendPoint = {
  seasonId: number;
  goalsPerTeamGame: number;
  pointsPerTeamGame: number;
  winsPerTeamGame: number;
};

export type HistoricalPeak = {
  rank: number;
  nhlPlayerId: number;
  name: string;
  position: string | null;
  startSeasonId: number;
  endSeasonId: number;
  gamesPlayed: number;
  value: number;
  totalRows: number;
};

export type HistoricalEraScore = {
  rank: number;
  nhlPlayerId: number;
  name: string;
  position: string | null;
  gamesPlayed: number;
  points: number;
  eraScore: number;
  totalRows: number;
};

export type HistoricalDecadeLeader = {
  decade: number;
  nhlPlayerId: number;
  name: string;
  gamesPlayed: number;
  points: number;
};

export type HistoryOverview = {
  careerPoints: HistoricalSkaterCareer[];
  careerGoals: HistoricalSkaterCareer[];
  goalieWins: HistoricalGoalieCareer[];
  teamSeasons: HistoricalTeamSeason[];
  recordProgression: HistoryRecordProgressionPoint[];
  leagueTrend: HistoryLeagueTrendPoint[];
};

export type HistoricalPlayerSeasons = {
  skaters: HistoricalSkaterSeason[];
  goalies: HistoricalGoalieSeason[];
};
