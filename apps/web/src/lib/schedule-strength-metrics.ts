import {
  scheduleStrengthMetrics,
  type ScheduleStrengthGame,
  type ScheduleStrengthMetric,
} from "@/contracts/schedule-strength";

export const scheduleStrengthMetricOptions = scheduleStrengthMetrics;

export const scheduleStrengthMetricDefinitions: Record<
  ScheduleStrengthMetric,
  { label: string; shortLabel: string; description: string }
> = {
  standings: {
    label: "Standings-based",
    shortLabel: "Points %",
    description:
      "Opponent points percentage before each game. Higher values mean a harder schedule.",
  },
  "goal-differential": {
    label: "Goal differential",
    shortLabel: "Goal diff. / game",
    description:
      "Opponent goal differential per prior game. Higher values mean a harder schedule.",
  },
  "expected-goals": {
    label: "Expected goals",
    shortLabel: "5v5 xG%",
    description:
      "Opponent five-on-five expected-goal share before each game. Higher values mean a harder schedule.",
  },
};

export function scheduleStrengthMetricValue(
  game: ScheduleStrengthGame,
  metric: ScheduleStrengthMetric,
): number | null {
  if (metric === "goal-differential") {
    return game.opponentGoalDifferentialPerGame;
  }
  if (metric === "expected-goals") {
    return game.opponentExpectedGoalsPercentage;
  }
  return game.opponentPointsPercentage;
}

export function scheduleStrengthMetricRatingSeasonId(
  game: ScheduleStrengthGame,
  metric: ScheduleStrengthMetric,
): number | null {
  return metric === "expected-goals"
    ? game.opponentExpectedGoalsSeasonId
    : game.opponentResultsSeasonId;
}

export function formatScheduleStrengthMetric(
  value: number | null,
  metric: ScheduleStrengthMetric,
): string {
  if (value === null) return "—";
  if (metric === "goal-differential") {
    return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
  }
  if (metric === "standings") return value.toFixed(3).replace(/^0/, "");
  return `${(value * 100).toFixed(1)}%`;
}

export function difficultyLabel(
  value: number,
  metric: ScheduleStrengthMetric,
): string {
  const normalized =
    metric === "goal-differential" ? 0.5 + value / 4 : value;
  if (normalized >= 0.56) return "Very difficult";
  if (normalized >= 0.52) return "Difficult";
  if (normalized > 0.48) return "Balanced";
  if (normalized > 0.44) return "Favorable";
  return "Very favorable";
}
