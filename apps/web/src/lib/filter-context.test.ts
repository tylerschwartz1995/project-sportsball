import { describe, expect, it } from "vitest";
import { preservePresentation } from "@/lib/filter-context";

describe("filter navigation context", () => {
  it("keeps the latest chart choices while applying a different workload", () => {
    const next = preservePresentation(
      new URLSearchParams("minimum=500&xMetric=goalsPer60"),
      new URLSearchParams("minimum=100&xMetric=pointsPer60&display=charts"),
    );
    expect(next.get("minimum")).toBe("500");
    expect(next.get("xMetric")).toBe("pointsPer60");
    expect(next.get("display")).toBe("charts");
  });
  it("does not revive a chart choice that was reset to its default", () => {
    const next = preservePresentation(
      new URLSearchParams("phase=playoffs&chartVenue=away"),
      new URLSearchParams("phase=regular"),
    );
    expect(next.get("phase")).toBe("playoffs");
    expect(next.has("chartVenue")).toBe(false);
  });
  it("does not reintroduce cleared population filters or pagination", () => {
    const next = preservePresentation(
      new URLSearchParams("season=20252026"),
      new URLSearchParams("country=CAN&team=22&page=5&chartWindow=20"),
    );
    expect(next.toString()).toBe("season=20252026&chartWindow=20");
  });
});
