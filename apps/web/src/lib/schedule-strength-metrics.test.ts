import { describe, expect, it } from "vitest";

import type { ScheduleStrengthGame } from "@/contracts/schedule-strength";
import {
  formatScheduleStrengthMetric,
  scheduleStrengthMetricRatingSeasonId,
  scheduleStrengthMetricValue,
} from "@/lib/schedule-strength-metrics";

const game = {
  opponentPointsPercentage: 0.561,
  opponentGoalDifferentialPerGame: 0.245,
  opponentExpectedGoalsPercentage: 0.5234,
  opponentResultsSeasonId: 20252026,
  opponentExpectedGoalsSeasonId: 20242025,
} as ScheduleStrengthGame;

describe("schedule strength metric presentation", () => {
  it("selects and formats each stored metric", () => {
    expect(
      formatScheduleStrengthMetric(
        scheduleStrengthMetricValue(game, "standings"),
        "standings",
      ),
    ).toBe(".561");
    expect(
      formatScheduleStrengthMetric(
        scheduleStrengthMetricValue(game, "goal-differential"),
        "goal-differential",
      ),
    ).toBe("+0.24");
    expect(
      formatScheduleStrengthMetric(
        scheduleStrengthMetricValue(game, "expected-goals"),
        "expected-goals",
      ),
    ).toBe("52.3%");
  });

  it("uses the matching coverage season for each metric", () => {
    expect(scheduleStrengthMetricRatingSeasonId(game, "standings")).toBe(
      20252026,
    );
    expect(
      scheduleStrengthMetricRatingSeasonId(game, "goal-differential"),
    ).toBe(20252026);
    expect(scheduleStrengthMetricRatingSeasonId(game, "expected-goals")).toBe(
      20242025,
    );
  });
});
