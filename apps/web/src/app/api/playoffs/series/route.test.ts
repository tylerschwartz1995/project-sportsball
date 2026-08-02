import { beforeEach, describe, expect, it, vi } from "vitest";

const getStatsMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/playoffs", () => ({
  getPlayoffSeriesPlayerStats: getStatsMock,
}));

import { GET } from "@/app/api/playoffs/series/route";

describe("playoff series API", () => {
  beforeEach(() => {
    getStatsMock.mockReset();
  });

  it("rejects invalid series coordinates before querying", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/playoffs/series?season=20242025&round=5&matchup=1",
      ),
    );

    expect(response.status).toBe(400);
    expect(getStatsMock).not.toHaveBeenCalled();
  });

  it("returns one cacheable series player package", async () => {
    const data = {
      skaters: [],
      goalies: [],
      advancedSkaters: [],
      advancedGoalies: [],
    };
    getStatsMock.mockResolvedValue(data);

    const response = await GET(
      new Request(
        "http://localhost/api/playoffs/series?season=20242025&round=1&matchup=5",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=300");
    expect(getStatsMock).toHaveBeenCalledWith(20242025, 1, 5);
    await expect(response.json()).resolves.toEqual({ data });
  });
});
