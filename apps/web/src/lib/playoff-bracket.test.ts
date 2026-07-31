import { describe, expect, it } from "vitest";

import { parsePlayoffGameNumber } from "@/lib/playoff-bracket";

describe("parsePlayoffGameNumber", () => {
  it("extracts round, matchup, and game from an NHL playoff game id", () => {
    expect(parsePlayoffGameNumber(2025030416)).toEqual({
      round: 4,
      matchup: 1,
      gameNumber: 6,
    });
  });
});
