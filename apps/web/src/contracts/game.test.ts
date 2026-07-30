import { describe, expect, it } from "vitest";

import { parseGameDate } from "@/contracts/game";

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
