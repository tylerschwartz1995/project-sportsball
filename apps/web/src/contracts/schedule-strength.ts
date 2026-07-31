export const scheduleStrengthMetrics = [
  "standings",
  "goal-differential",
  "expected-goals",
] as const;

export type ScheduleStrengthMetric =
  (typeof scheduleStrengthMetrics)[number];

export type ScheduleStrengthGame = {
  nhlGameId: number;
  gameDate: string;
  startTimeUtc: string;
  state: string;
  completed: boolean;
  isHome: boolean;
  opponentNhlTeamId: number;
  opponentAbbreviation: string;
  opponentName: string;
  teamScore: number | null;
  opponentScore: number | null;
  opponentPriorGames: number;
  opponentResultsSeasonId: number | null;
  opponentExpectedGoalsSeasonId: number | null;
  opponentPointsPercentage: number | null;
  opponentGoalDifferentialPerGame: number | null;
  opponentExpectedGoalsPercentage: number | null;
  restDays: number | null;
  isBackToBack: boolean;
};

export type TeamScheduleStrength = {
  seasonId: number;
  teamNhlId: number;
  games: ScheduleStrengthGame[];
};

export function parseScheduleStrengthMetric(
  value: string | undefined,
): ScheduleStrengthMetric {
  return scheduleStrengthMetrics.includes(value as ScheduleStrengthMetric)
    ? (value as ScheduleStrengthMetric)
    : "standings";
}
