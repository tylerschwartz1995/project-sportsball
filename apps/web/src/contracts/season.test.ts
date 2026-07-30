import { describe, expect, it } from "vitest";

import { formatSeasonLabel, parseSeasonId } from "@/contracts/season";

describe("parseSeasonId", () => {
  it("accepts a valid NHL season identifier", () => {
    expect(parseSeasonId("20242025")).toBe(20242025);
  });

  it.each(["2024", "abcdefgh", "20242026", "18991900", "", null, undefined])(
    "rejects invalid value %s",
    (value) => {
      expect(parseSeasonId(value)).toBeNull();
    },
  );
});

describe("formatSeasonLabel", () => {
  it("uses the compact hockey-season form", () => {
    expect(formatSeasonLabel(2005, 2006)).toBe("2005–06");
  });
});
