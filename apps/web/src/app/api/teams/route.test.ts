import { beforeEach, describe, expect, it, vi } from "vitest";

const listTeamsBySeasonMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/teams", () => ({
  listTeamsBySeason: listTeamsBySeasonMock,
}));

import { GET } from "@/app/api/teams/route";

describe("GET /api/teams", () => {
  beforeEach(() => {
    listTeamsBySeasonMock.mockReset();
  });

  it("rejects malformed seasons", async () => {
    const response = await GET(
      new Request("http://localhost/api/teams?season=2025"),
    );
    expect(response.status).toBe(400);
    expect(listTeamsBySeasonMock).not.toHaveBeenCalled();
  });

  it("returns team summaries with shared-cache headers", async () => {
    listTeamsBySeasonMock.mockResolvedValue([{ team: { nhlTeamId: 12 } }]);
    const response = await GET(
      new Request("http://localhost/api/teams?season=20252026"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=300");
    expect(listTeamsBySeasonMock).toHaveBeenCalledWith(20252026);
  });
});
