import { describe, expect, it } from "vitest";

import {
  formatPlayerPosition,
  formatPlayerPositionLong,
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

  it("provides full position names for profile context", () => {
    expect(formatPlayerPositionLong("C")).toBe("Center");
    expect(formatPlayerPositionLong("D")).toBe("Defenseman");
    expect(formatPlayerPositionLong("R")).toBe("Right Wing");
    expect(formatPlayerPositionLong("L")).toBe("Left Wing");
    expect(formatPlayerPositionLong("G")).toBe("Goalie");
  });
});

describe("player position filtering", () => {
  it("normalizes source values and rejects unsupported URL values", () => {
    expect(parsePlayerPositionFilter("F")).toBe("F");
    expect(parsePlayerPositionFilter("G")).toBe("");
    expect(parsePlayerPositionFilter(undefined)).toBe("");
  });
});
