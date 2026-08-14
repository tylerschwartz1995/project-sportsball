import { describe, expect, it } from "vitest";

import type { DraftClassPerformance } from "@/contracts/draft";
import {
  parseDraftClassSort,
  sortDraftClassPerformance,
} from "@/lib/draft-class-rankings";

function draftClass(
  draftYear: number,
  averageGames: number,
  gameScorePerSkaterPick: number | null,
): DraftClassPerformance {
  return {
    draftYear,
    selections: 200,
    playersWithNhlGames: 80,
    appearanceRate: 0.4,
    hundredGamePlayers: 60,
    hundredGameRate: 0.3,
    fiveHundredGamePlayers: 20,
    fiveHundredGameRate: 0.1,
    totalGames: averageGames * 200,
    averageGames,
    skaterSelections: 180,
    totalSkaterPoints: 9_000,
    pointsPerSkaterPick: 50,
    gameScorePerSkaterPick,
  };
}

describe("draft class rankings", () => {
  it("falls back to the default ranking", () => {
    expect(parseDraftClassSort(undefined)).toBe("average-games");
    expect(parseDraftClassSort("unknown")).toBe("average-games");
    expect(parseDraftClassSort("appearance-rate")).toBe("appearance-rate");
  });

  it("sorts the complete result before pagination", () => {
    const rows = [
      draftClass(2001, 120, 3),
      draftClass(2002, 180, null),
      draftClass(2003, 150, 7),
    ];

    expect(
      sortDraftClassPerformance(rows, "average-games", "desc").map(
        (row) => row.draftYear,
      ),
    ).toEqual([2002, 2003, 2001]);
    expect(
      sortDraftClassPerformance(rows, "game-score", "desc").map(
        (row) => row.draftYear,
      ),
    ).toEqual([2003, 2001, 2002]);
  });
});
