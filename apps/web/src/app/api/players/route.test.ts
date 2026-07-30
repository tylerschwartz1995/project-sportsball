import { beforeEach, describe, expect, it, vi } from "vitest";

const listPlayersBySeasonMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/players", () => ({
  listPlayersBySeason: listPlayersBySeasonMock,
}));

import { GET } from "@/app/api/players/route";

describe("GET /api/players", () => {
  beforeEach(() => {
    listPlayersBySeasonMock.mockReset();
  });

  it("returns 404 when a season has no participating players", async () => {
    listPlayersBySeasonMock.mockResolvedValue({
      seasonId: 20992100,
      skaters: [],
      goalies: [],
    });
    const response = await GET(
      new Request("http://localhost/api/players?season=20992100"),
    );
    expect(response.status).toBe(404);
  });

  it("returns player summaries with shared-cache headers", async () => {
    listPlayersBySeasonMock.mockResolvedValue({
      seasonId: 20252026,
      skaters: [{ nhlPlayerId: 8478402 }],
      goalies: [],
    });
    const response = await GET(
      new Request("http://localhost/api/players?season=20252026"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=300");
    expect(listPlayersBySeasonMock).toHaveBeenCalledWith(20252026);
  });
});
