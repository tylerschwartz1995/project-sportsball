import { beforeEach, describe, expect, it, vi } from "vitest";

const poolQueryMock = vi.hoisted(() => vi.fn());

vi.mock("pg", () => ({
  Pool: class {
    query = poolQueryMock;
    end = vi.fn();
  },
}));

import { query } from "@/data/database";

describe("database query telemetry", () => {
  beforeEach(() => {
    poolQueryMock.mockReset();
    vi.restoreAllMocks();
    process.env.SPORTSBALL_WEB_DATABASE_URL = "postgresql://test:test@localhost/test";
    process.env.SPORTSBALL_SLOW_QUERY_MS = "0";
  });

  it("logs slow-query metadata without SQL values", async () => {
    poolQueryMock.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(query("SELECT id FROM players WHERE nhl_id = $1", [8478402]))
      .resolves.toEqual([{ id: 1 }]);

    const logged = String(warn.mock.calls[0]?.[0]);
    expect(JSON.parse(logged)).toMatchObject({
      event: "slow-database-query",
      rowCount: 1,
      operation: "SELECT",
    });
    expect(logged).not.toContain("8478402");
    expect(logged).not.toContain("players WHERE");
  });

  it("logs failed-query metadata and rethrows the original error", async () => {
    const error = new Error("database unavailable");
    poolQueryMock.mockRejectedValue(error);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(query("SELECT 1")).rejects.toBe(error);
    expect(JSON.parse(String(warn.mock.calls[0]?.[0]))).toMatchObject({
      event: "database-query-error",
      rowCount: null,
      operation: "SELECT",
    });
  });
});
