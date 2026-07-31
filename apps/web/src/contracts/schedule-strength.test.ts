import { describe, expect, it } from "vitest";

import { parseScheduleStrengthMetric } from "@/contracts/schedule-strength";

describe("parseScheduleStrengthMetric", () => {
  it("accepts supported metrics", () => {
    expect(parseScheduleStrengthMetric("goal-differential")).toBe(
      "goal-differential",
    );
    expect(parseScheduleStrengthMetric("expected-goals")).toBe(
      "expected-goals",
    );
  });

  it("falls back to standings", () => {
    expect(parseScheduleStrengthMetric(undefined)).toBe("standings");
    expect(parseScheduleStrengthMetric("model")).toBe("standings");
  });
});
