import { describe, expect, it } from "vitest";

import { formatPlayerPosition } from "@/lib/player-position";

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
