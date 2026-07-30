import { describe, expect, it } from "vitest";

import { formatMoneyPuckPeriodClock } from "@/lib/moneypuck-shot";

describe("formatMoneyPuckPeriodClock", () => {
  it.each([
    [422, 1, "7:02"],
    [1344, 2, "2:24"],
    [3560, 3, "19:20"],
  ])(
    "converts %i cumulative game seconds in period %i to %s",
    (gameTimeSeconds, period, expected) => {
      expect(formatMoneyPuckPeriodClock(gameTimeSeconds, period)).toBe(expected);
    },
  );
});
