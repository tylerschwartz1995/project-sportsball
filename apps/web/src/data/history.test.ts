import { describe, expect, it } from "vitest";

import { parseHistoryMetric, parseHistoryView } from "@/data/history";

describe("historical leader filters", () => {
  it("accepts supported views and defaults invalid values to skaters", () => {
    expect(parseHistoryView("goalies")).toBe("goalies");
    expect(parseHistoryView("teams")).toBe("teams");
    expect(parseHistoryView("records")).toBe("skaters");
  });

  it("only accepts metrics belonging to the selected view", () => {
    expect(parseHistoryMetric("skaters", "goals")).toBe("goals");
    expect(parseHistoryMetric("goalies", "shutouts")).toBe("shutouts");
    expect(parseHistoryMetric("teams", "pointPercentage")).toBe(
      "pointPercentage",
    );
    expect(parseHistoryMetric("goalies", "points")).toBe("wins");
  });
});
