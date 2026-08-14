import { describe, expect, it, vi } from "vitest";

const unstableCacheMock = vi.hoisted(() =>
  vi.fn((loader: unknown) => loader),
);

vi.mock("next/cache", () => ({ unstable_cache: unstableCacheMock }));
vi.mock("@/data/seasons", () => ({
  listSeasons: vi.fn(),
  listScheduleSeasons: vi.fn(),
}));
vi.mock("@/data/standings", () => ({
  getStandings: vi.fn(),
  getStandingsPointsHistory: vi.fn(),
}));
vi.mock("@/data/schedule-strength", () => ({
  getTeamScheduleStrength: vi.fn(),
}));
vi.mock("@/data/game-logs", () => ({ getTeamGameLog: vi.fn() }));
vi.mock("@/data/games", () => ({ listTeamScheduleSeasonIds: vi.fn() }));
vi.mock("@/data/teams", () => ({
  getTeamIdentityForSeason: vi.fn(),
  getTeamSeasonDetail: vi.fn(),
  getTeamSeasonProfile: vi.fn(),
  listTeamSeasonIds: vi.fn(),
  listTeamsBySeason: vi.fn(),
}));

await import("@/data/page-cache");

describe("page cache policy", () => {
  it("uses long-lived reference data and short-lived active data", () => {
    expect(unstableCacheMock).toHaveBeenCalledTimes(12);
    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["page-seasons-v1"],
      { revalidate: 3_600, tags: ["seasons"] },
    );
    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["page-schedule-seasons-v1"],
      { revalidate: 3_600, tags: ["seasons"] },
    );
    for (const key of [
      "page-standings-v1",
      "page-standings-points-history-v1",
      "page-teams-by-season-v1",
      "page-team-schedule-strength-v1",
      "page-team-season-ids-v1",
      "page-team-schedule-season-ids-v1",
      "page-team-season-profile-v1",
      "page-team-season-detail-v1",
      "page-team-identity-v1",
      "page-team-game-log-v1",
    ]) {
      expect(unstableCacheMock).toHaveBeenCalledWith(
        expect.any(Function),
        [key],
        expect.objectContaining({ revalidate: 300 }),
      );
    }
  });
});
