import { describe, expect, it } from "vitest";

import {
  firstQueryValue,
  matchesSearch,
  normalizeSearch,
  paginate,
  parsePage,
} from "@/lib/directory";

describe("directory query helpers", () => {
  it("normalizes search input and query arrays", () => {
    expect(firstQueryValue(["first", "second"])).toBe("first");
    expect(normalizeSearch("  Connor McDavid  ")).toBe("Connor McDavid");
  });

  it("rejects invalid page numbers", () => {
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("1.5")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("3")).toBe(3);
  });

  it("clamps pages and reports the visible range", () => {
    expect(paginate([1, 2, 3, 4, 5], 10, 2)).toEqual({
      items: [5],
      currentPage: 3,
      totalPages: 3,
      totalItems: 5,
      firstItem: 5,
      lastItem: 5,
    });
  });

  it("matches search without case sensitivity", () => {
    expect(matchesSearch("oilers", "Edmonton Oilers", "EDM")).toBe(true);
    expect(matchesSearch("edm", "Edmonton Oilers", "EDM")).toBe(true);
    expect(matchesSearch("canucks", "Edmonton Oilers", "EDM")).toBe(false);
  });
});
