export type HistoryView = "skaters" | "goalies" | "teams";

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

export type HistoricalPlayerSeasons = {
  skaters: HistoricalSkaterSeason[];
  goalies: HistoricalGoalieSeason[];
};
