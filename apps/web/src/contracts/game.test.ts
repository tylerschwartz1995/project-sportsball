import { describe, expect, it } from "vitest";

import {
  formatGameState,
  formatGameTeamRecord,
  parseGameDate,
} from "@/contracts/game";

describe("parseGameDate", () => {
  it.each([
    ["2026-06-14", "2026-06-14"],
    ["2005-10-05", "2005-10-05"],
    ["2024-02-29", "2024-02-29"],
  ])("accepts a real ISO date", (value, expected) => {
    expect(parseGameDate(value)).toBe(expected);
  });

  it.each([
    undefined,
    null,
    "",
    "2026-6-14",
    "2026-02-29",
    "2026-13-01",
    "not-a-date",
  ])("rejects %s", (value) => {
    expect(parseGameDate(value)).toBeNull();
  });
});

describe("game labels", () => {
  it("formats a point-in-time W-L-OTL record", () => {
    expect(
      formatGameTeamRecord({ wins: 37, losses: 33, overtimeLosses: 12 }),
    ).toBe("37-33-12");
  });

  it.each([
    ["FUT", "Scheduled"],
    ["PRE", "Scheduled"],
    ["LIVE", "Live"],
    ["CRIT", "Live"],
    ["OFF", "OFF"],
  ])("formats the %s game state as %s", (state, expected) => {
    expect(formatGameState(state)).toBe(expected);
  });
});
