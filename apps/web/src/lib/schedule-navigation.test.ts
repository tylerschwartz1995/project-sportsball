import { describe, expect, it } from "vitest";

import {
  clampScheduleDate,
  formatScheduleMonth,
  resolveScheduleDate,
  scheduleMonth,
  scheduleMonthKey,
  scheduleWeek,
  shiftScheduleDate,
  shiftScheduleMonth,
} from "@/lib/schedule-navigation";

const dates = [
  { date: "2026-06-14", gameCount: 1 },
  { date: "2026-06-11", gameCount: 1 },
  { date: "2026-04-18", gameCount: 3 },
];

describe("schedule navigation", () => {
  it("retains an off-day inside the selected phase", () => {
    expect(resolveScheduleDate("2026-05-01", dates)).toBe("2026-05-01");
  });

  it("uses the nearest phase boundary for an out-of-range date", () => {
    expect(resolveScheduleDate("2026-04-16", dates)).toBe("2026-04-18");
    expect(resolveScheduleDate("2026-06-20", dates)).toBe("2026-06-14");
  });

  it("uses the query-defined default when no date is requested", () => {
    expect(resolveScheduleDate(null, dates)).toBe("2026-06-14");
  });

  it("builds a Monday-through-Sunday week", () => {
    expect(scheduleWeek("2026-04-16")).toEqual([
      "2026-04-13",
      "2026-04-14",
      "2026-04-15",
      "2026-04-16",
      "2026-04-17",
      "2026-04-18",
      "2026-04-19",
    ]);
  });

  it("shifts and clamps dates without local-time drift", () => {
    expect(shiftScheduleDate("2026-01-01", -1)).toBe("2025-12-31");
    expect(clampScheduleDate("2026-04-10", "2026-04-18", "2026-06-14")).toBe(
      "2026-04-18",
    );
  });

  it("builds a complete Monday-first calendar month", () => {
    const month = scheduleMonth("2026-08-12");

    expect(month).toHaveLength(42);
    expect(month.slice(0, 5)).toEqual([null, null, null, null, null]);
    expect(month[5]).toBe("2026-08-01");
    expect(month[35]).toBe("2026-08-31");
    expect(month.slice(36)).toEqual([null, null, null, null, null, null]);
  });

  it("moves between calendar months and formats their labels", () => {
    expect(shiftScheduleMonth("2026-01-31", -1)).toBe("2025-12-01");
    expect(shiftScheduleMonth("2026-12-15", 1)).toBe("2027-01-01");
    expect(scheduleMonthKey("2026-08-12")).toBe("2026-08");
    expect(formatScheduleMonth("2026-08-01")).toBe("August 2026");
  });
});
