import { beforeEach, describe, expect, it, vi } from "vitest";

const getStandingsMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/standings", () => ({
  getStandings: getStandingsMock,
}));

import { GET } from "@/app/api/standings/route";

describe("GET /api/standings", () => {
  beforeEach(() => {
    getStandingsMock.mockReset();
  });

  it("rejects a malformed season without querying PostgreSQL", async () => {
    const response = await GET(
      new Request("http://localhost/api/standings?season=2024"),
    );

    expect(response.status).toBe(400);
    expect(getStandingsMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the season has no standings", async () => {
    getStandingsMock.mockResolvedValue([]);

    const response = await GET(
      new Request("http://localhost/api/standings?season=20992100"),
    );

    expect(response.status).toBe(404);
    expect(getStandingsMock).toHaveBeenCalledWith(20992100);
  });

  it("returns standings with shared-cache headers", async () => {
    getStandingsMock.mockResolvedValue([{ teamId: 1 }]);

    const response = await GET(
      new Request("http://localhost/api/standings?season=20242025"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=300");
    await expect(response.json()).resolves.toEqual({
      data: [{ teamId: 1 }],
    });
  });
});
