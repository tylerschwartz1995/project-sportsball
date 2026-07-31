import { describe, expect, it } from "vitest";

import {
  parseHistoryFilters,
  parseHistoryMetric,
  parseHistoryView,
} from "@/data/history";

describe("historical leader filters", () => {
  it("accepts supported views and defaults invalid values to skaters", () => {
    expect(parseHistoryView("goalies")).toBe("goalies");
    expect(parseHistoryView("teams")).toBe("teams");
    expect(parseHistoryView("records")).toBe("skaters");
  });

  it("only accepts metrics belonging to the selected view", () => {
    expect(parseHistoryMetric("skaters", "goals")).toBe("goals");
    expect(parseHistoryMetric("goalies", "shutouts")).toBe("shutouts");
    expect(parseHistoryMetric("skaters", "pointsPerGame")).toBe(
      "pointsPerGame",
    );
    expect(parseHistoryMetric("goalies", "savePercentage")).toBe(
      "savePercentage",
    );
    expect(parseHistoryMetric("teams", "pointPercentage")).toBe(
      "pointPercentage",
    );
    expect(parseHistoryMetric("goalies", "points")).toBe("wins");
  });

  it("bounds years, normalizes reversed ranges, and cleans filters", () => {
    expect(
      parseHistoryFilters({
        startYear: "2010",
        endYear: "1980",
        minimumGames: "500",
        position: " C ",
        team: "EDM",
        country: "CAN",
      }),
    ).toEqual({
      startYear: 1980,
      endYear: 2010,
      minimumGames: 500,
      position: "C",
      team: "EDM",
      country: "CAN",
    });
  });
});
