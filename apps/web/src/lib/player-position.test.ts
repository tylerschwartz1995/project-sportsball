import { describe, expect, it } from "vitest";

import {
  formatPlayerPosition,
  matchesPlayerPosition,
  parsePlayerPositionFilter,
} from "@/lib/player-position";

describe("player position display", () => {
  it("uses explicit wing abbreviations", () => {
    expect(formatPlayerPosition("L")).toBe("LW");
    expect(formatPlayerPosition("R")).toBe("RW");
  });

  it("preserves other NHL position codes", () => {
    expect(formatPlayerPosition("C")).toBe("C");
    expect(formatPlayerPosition("D")).toBe("D");
    expect(formatPlayerPosition("G")).toBe("G");
  });

  it("uses the requested fallback when a position is unavailable", () => {
    expect(formatPlayerPosition(null)).toBe("—");
    expect(formatPlayerPosition(undefined, "Player")).toBe("Player");
  });
});

describe("player position filtering", () => {
  it("groups centers and both wings as forwards", () => {
    expect(matchesPlayerPosition("C", "F")).toBe(true);
    expect(matchesPlayerPosition("L", "F")).toBe(true);
    expect(matchesPlayerPosition("R", "F")).toBe(true);
    expect(matchesPlayerPosition("D", "F")).toBe(false);
  });

  it("supports each exact skater position", () => {
    expect(matchesPlayerPosition("D", "D")).toBe(true);
    expect(matchesPlayerPosition("C", "C")).toBe(true);
    expect(matchesPlayerPosition("R", "R")).toBe(true);
    expect(matchesPlayerPosition("L", "L")).toBe(true);
    expect(matchesPlayerPosition("C", "R")).toBe(false);
  });

  it("normalizes source values and rejects unsupported URL values", () => {
    expect(matchesPlayerPosition(" r ", "R")).toBe(true);
    expect(matchesPlayerPosition(null, "")).toBe(true);
    expect(parsePlayerPositionFilter("F")).toBe("F");
    expect(parsePlayerPositionFilter("G")).toBe("");
    expect(parsePlayerPositionFilter(undefined)).toBe("");
  });
});
