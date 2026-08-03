import { describe, expect, it } from "vitest";

import { stableMetricDomain } from "@/lib/rolling-performance";

describe("stableMetricDomain", () => {
  it("uses an honest zero baseline for rate metrics", () => {
    expect(stableMetricDomain([0.8, 2.6, 1.4])).toEqual([0, 3]);
  });

  it("pads percentage metrics without discarding their reference value", () => {
    expect(
      stableMetricDomain([46, 58], {
        percentage: true,
        referenceValue: 50,
      }),
    ).toEqual([44, 60]);
  });

  it("keeps signed metrics balanced around zero", () => {
    expect(stableMetricDomain([-0.4, 0.7], { signed: true })).toEqual([
      -1,
      1,
    ]);
  });
});
