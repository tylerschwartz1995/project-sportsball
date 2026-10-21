import { describe, expect, it } from "vitest";

import {
  gameTypeForPhase,
  parseSeasonPhase,
  seasonPhaseLabel,
} from "@/contracts/season-phase";

describe("season phase", () => {
  it("defaults statistical views to the regular season", () => {
    expect(parseSeasonPhase(undefined)).toBe("regular");
    expect(gameTypeForPhase("regular")).toBe(2);
    expect(seasonPhaseLabel("regular")).toBe("Regular Season");
  });

  it("maps playoff views to NHL game type 3", () => {
    expect(parseSeasonPhase("playoffs")).toBe("playoffs");
    expect(gameTypeForPhase("playoffs")).toBe(3);
    expect(seasonPhaseLabel("playoffs")).toBe("Playoffs");
  });
});
