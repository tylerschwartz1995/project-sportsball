import { describe, expect, it } from "vitest";

import { metricDefinition } from "@/lib/metric-definitions";

describe("metric definitions", () => {
  it("explains common advanced abbreviations in plain language", () => {
    expect(metricDefinition("xG%"))?.toContain("Expected-goal share");
    expect(metricDefinition("GSAx"))?.toContain("Goals saved above expected");
  });

  it("explains common standings and player abbreviations", () => {
    expect(metricDefinition("RW"))?.toContain("Regulation wins");
    expect(metricDefinition("OTL"))?.toContain("Overtime");
    expect(metricDefinition("SV%"))?.toContain("Save percentage");
    expect(metricDefinition("PIM"))?.toContain("Penalty minutes");
  });

  it("does not invent help for an unknown column", () => {
    expect(metricDefinition("Player")).toBeUndefined();
  });
});
