import { describe, expect, it } from "vitest";

import { playerDirectoryClearHref } from "@/lib/player-directory-url";

describe("player directory URLs", () => {
  it("clears optional filters while preserving result context", () => {
    expect(
      playerDirectoryClearHref({
        seasonId: 20252026,
        phase: "playoffs",
        category: "skaters",
        sort: "goals",
        direction: "asc",
      }),
    ).toBe(
      "/players?season=20252026&phase=playoffs&type=skaters&sort=goals&dir=asc",
    );
  });
});
