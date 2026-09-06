import { describe, expect, it } from "vitest";
import type { AdvancedSkaterLeaderboardRow } from "@/contracts/advanced-leaderboard";
import { sortAdvancedRows } from "./advanced-table";

describe("advanced leaderboard sample sorting", () => {
  const rows = Array.from({ length: 200 }, (_, index) => ({
    player: { name: `Player ${index}`, nhlPlayerId: index, position: "C" },
    individualPoints: index === 100 ? null : index,
  } as AdvancedSkaterLeaderboardRow));

  it("sorts the entire sample before pagination and keeps missing values last", () => {
    const sorted = sortAdvancedRows(rows, "points", "desc");
    expect(sorted.slice(0, 50).map(row => row.individualPoints)).toEqual(Array.from({ length: 50 }, (_, index) => 199 - index));
    expect(sorted.at(-1)?.individualPoints).toBeNull();
    expect(sortAdvancedRows(rows, "points", "asc").at(-1)?.individualPoints).toBeNull();
    expect(rows[0].individualPoints).toBe(0);
  });

  it("sorts player names independently of the numeric ranking", () => {
    expect(sortAdvancedRows(rows.slice(0, 3), "player", "desc").map(row => row.player.name)).toEqual(["Player 2", "Player 1", "Player 0"]);
  });
});
