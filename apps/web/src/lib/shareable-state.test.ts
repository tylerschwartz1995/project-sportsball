import { describe, expect, it } from "vitest";

import { resolveUrlChoice } from "@/lib/shareable-state";

describe("shareable chart state", () => {
  it("restores a supported stable key", () => {
    expect(resolveUrlChoice("away", ["all", "home", "away"], "all")).toBe("away");
  });

  it("falls back safely for missing or obsolete keys", () => {
    expect(resolveUrlChoice("road", ["all", "home", "away"], "all")).toBe("all");
    expect(resolveUrlChoice(null, ["pressure", "cumulative"], "pressure")).toBe("pressure");
  });
});
