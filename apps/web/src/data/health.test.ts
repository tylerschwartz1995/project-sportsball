import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/database", () => ({
  query: queryMock,
}));

import {
  evaluateDailyIngestion,
  getServiceHealth,
} from "@/data/health";

const now = new Date("2026-01-10T15:00:00.000Z");

describe("service health", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("reports a recent successful daily run as healthy", async () => {
    queryMock.mockResolvedValue([
      {
        status: "succeeded",
        started_at: new Date("2026-01-10T13:00:00.000Z"),
        finished_at: new Date("2026-01-10T14:00:00.000Z"),
      },
    ]);

    await expect(getServiceHealth(now)).resolves.toMatchObject({
      service: "sportsball-web",
      status: "ok",
      database: "ok",
      dailyIngestion: {
        status: "ok",
        runStatus: "succeeded",
        lastCompletedAt: "2026-01-10T14:00:00.000Z",
      },
    });
  });

  it("reports a run between 36 and 48 hours old as degraded", () => {
    const result = evaluateDailyIngestion(
      {
        status: "succeeded",
        started_at: new Date("2026-01-08T21:00:00.000Z"),
        finished_at: new Date("2026-01-08T23:00:00.000Z"),
      },
      now,
    );

    expect(result.status).toBe("degraded");
    expect(result.message).toContain("older than 36 hours");
  });

  it("reports failed, stuck, stale, and missing runs as errors", () => {
    expect(
      evaluateDailyIngestion(
        {
          status: "failed",
          started_at: new Date("2026-01-10T13:00:00.000Z"),
          finished_at: new Date("2026-01-10T13:30:00.000Z"),
        },
        now,
      ).status,
    ).toBe("error");
    expect(
      evaluateDailyIngestion(
        {
          status: "running",
          started_at: new Date("2026-01-10T12:00:00.000Z"),
          finished_at: null,
        },
        now,
      ).status,
    ).toBe("error");
    expect(
      evaluateDailyIngestion(
        {
          status: "succeeded",
          started_at: new Date("2026-01-08T12:00:00.000Z"),
          finished_at: new Date("2026-01-08T14:00:00.000Z"),
        },
        now,
      ).status,
    ).toBe("error");
    expect(evaluateDailyIngestion(null, now).status).toBe("error");
  });
});
