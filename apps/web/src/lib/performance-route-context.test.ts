import { describe, expect, it } from "vitest";

import { performanceRouteContext } from "@/lib/performance-route-context";

describe("performanceRouteContext", () => {
  it("captures bounded route dimensions without retaining the full query", () => {
    const params = new URLSearchParams({
      season: "20252026",
      view: "strength",
      sos: "expected-goals",
      phase: "regular",
      q: "Tyler's private search",
    });

    expect(performanceRouteContext(params)).toEqual({
      routeView: "strength",
      routeSubView: "expected-goals",
      routePhase: "regular",
    });
  });

  it("uses section and display aliases for routes without a view parameter", () => {
    expect(
      performanceRouteContext(
        new URLSearchParams({ section: "careers", display: "progress" }),
      ),
    ).toEqual({ routeView: "careers", routeSubView: "progress" });
  });

  it("drops unexpected or high-cardinality values", () => {
    expect(
      performanceRouteContext(
        new URLSearchParams({ view: "../secret", phase: "x".repeat(41) }),
      ),
    ).toEqual({});
  });
});
