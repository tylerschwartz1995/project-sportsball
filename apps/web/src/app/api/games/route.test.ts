import { beforeEach, describe, expect, it, vi } from "vitest";

const getGamesByDateMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/games", () => ({
  getGamesByDate: getGamesByDateMock,
}));

import { GET } from "@/app/api/games/route";

describe("GET /api/games", () => {
  beforeEach(() => {
    getGamesByDateMock.mockReset();
  });

  it("rejects malformed inputs without querying PostgreSQL", async () => {
    const badSeason = await GET(
      new Request("http://localhost/api/games?season=2025&date=2026-06-14"),
    );
    const badDate = await GET(
      new Request(
        "http://localhost/api/games?season=20252026&date=2026-02-29",
      ),
    );

    expect(badSeason.status).toBe(400);
    expect(badDate.status).toBe(400);
    expect(getGamesByDateMock).not.toHaveBeenCalled();
  });

  it("returns 404 when no game exists on the requested date", async () => {
    getGamesByDateMock.mockResolvedValue([]);

    const response = await GET(
      new Request(
        "http://localhost/api/games?season=20252026&date=2026-01-01",
      ),
    );

    expect(response.status).toBe(404);
    expect(getGamesByDateMock).toHaveBeenCalledWith(20252026, "2026-01-01");
  });

  it("returns games with shared-cache headers", async () => {
    getGamesByDateMock.mockResolvedValue([{ nhlGameId: 2025030416 }]);

    const response = await GET(
      new Request(
        "http://localhost/api/games?season=20252026&date=2026-06-14",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=300");
    await expect(response.json()).resolves.toEqual({
      data: [{ nhlGameId: 2025030416 }],
    });
  });
});
