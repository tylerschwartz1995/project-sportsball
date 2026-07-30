import { beforeEach, describe, expect, it, vi } from "vitest";

const getServiceHealthMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/health", () => ({
  getServiceHealth: getServiceHealthMock,
}));

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  beforeEach(() => {
    getServiceHealthMock.mockReset();
  });

  it("returns a non-cached success response for healthy data", async () => {
    getServiceHealthMock.mockResolvedValue({
      service: "sportsball-web",
      status: "ok",
      database: "ok",
      checkedAt: "2026-01-10T15:00:00.000Z",
      dailyIngestion: {
        status: "ok",
        runStatus: "succeeded",
        lastCompletedAt: "2026-01-10T14:00:00.000Z",
        message: "The latest daily update completed within 36 hours.",
      },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({ status: "ok" });
  });

  it("returns 503 for a data-readiness error", async () => {
    getServiceHealthMock.mockResolvedValue({
      service: "sportsball-web",
      status: "error",
      database: "ok",
      checkedAt: "2026-01-10T15:00:00.000Z",
      dailyIngestion: {
        status: "error",
        runStatus: "failed",
        lastCompletedAt: "2026-01-10T14:00:00.000Z",
        message: "The latest daily update status is failed.",
      },
    });

    expect((await GET()).status).toBe(503);
  });

  it("returns a generic 503 when the database check throws", async () => {
    getServiceHealthMock.mockRejectedValue(new Error("secret connection detail"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      service: "sportsball-web",
      status: "error",
      database: "error",
      message: "Database health check failed.",
    });
    expect(JSON.stringify(body)).not.toContain("secret connection detail");
  });
});
