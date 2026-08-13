import { describe, expect, it } from "vitest";

import {
  gameTimelineHref,
  parseTimelinePeriod,
} from "@/lib/play-by-play-timeline";

describe("play-by-play timeline navigation", () => {
  it("accepts plausible NHL period numbers", () => {
    expect(parseTimelinePeriod("1")).toBe(1);
    expect(parseTimelinePeriod("5")).toBe(5);
    expect(parseTimelinePeriod("20")).toBe(20);
  });

  it("rejects malformed and unreasonable period values", () => {
    expect(parseTimelinePeriod(undefined)).toBeNull();
    expect(parseTimelinePeriod("0")).toBeNull();
    expect(parseTimelinePeriod("1.5")).toBeNull();
    expect(parseTimelinePeriod("21")).toBeNull();
    expect(parseTimelinePeriod("period-one")).toBeNull();
  });

  it("builds stable expand and collapse links", () => {
    expect(gameTimelineHref(2025030416, 2)).toBe(
      "/games/2025030416?view=scoring&timelinePeriod=2#timeline",
    );
    expect(gameTimelineHref(2025030416, null)).toBe(
      "/games/2025030416?view=scoring#timeline",
    );
  });
});
