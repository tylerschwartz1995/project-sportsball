import { describe, expect, it } from "vitest";

import { countryName, countryNameWithCode } from "@/lib/country-name";

describe("country names", () => {
  it("expands the three-letter codes used by player records", () => {
    expect(countryName("CAN")).toBe("Canada");
    expect(countryName("USA")).toBe("United States");
    expect(countryName("SWE")).toBe("Sweden");
  });

  it("can retain the source code when it helps a filter remain recognizable", () => {
    expect(countryNameWithCode("CZE")).toBe("Czechia (CZE)");
  });

  it("keeps an unknown code instead of inventing a name", () => {
    expect(countryName("ZZZ")).toBe("ZZZ");
  });
});
