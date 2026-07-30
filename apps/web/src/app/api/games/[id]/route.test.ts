import { beforeEach, describe, expect, it, vi } from "vitest";

const getGameBoxScoreMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/games", () => ({
  getGameBoxScore: getGameBoxScoreMock,
}));

import { GET } from "@/app/api/games/[id]/route";

describe("GET /api/games/[id]", () => {
  beforeEach(() => {
    getGameBoxScoreMock.mockReset();
  });

  it("rejects a malformed NHL game id", async () => {
    const response = await GET(new Request("http://localhost/api/games/nope"), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(response.status).toBe(400);
    expect(getGameBoxScoreMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the game does not exist", async () => {
    getGameBoxScoreMock.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost/api/games/1"), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns the box score with shared-cache headers", async () => {
    getGameBoxScoreMock.mockResolvedValue({ nhlGameId: 2025030416 });
    const response = await GET(
      new Request("http://localhost/api/games/2025030416"),
      {
        params: Promise.resolve({ id: "2025030416" }),
      },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=300");
    await expect(response.json()).resolves.toEqual({
      data: { nhlGameId: 2025030416 },
    });
  });
});
