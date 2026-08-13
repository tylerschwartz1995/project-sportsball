import { describe, expect, it } from "vitest";

import { metricDefinition } from "@/lib/metric-definitions";

describe("metric definitions", () => {
  it("explains common advanced abbreviations in plain language", () => {
    expect(metricDefinition("xG%"))?.toContain("Expected-goal share");
    expect(metricDefinition("GSAx"))?.toContain("Goals saved above expected");
  });

  it("does not invent help for an unknown column", () => {
    expect(metricDefinition("Player")).toBeUndefined();
  });
});
