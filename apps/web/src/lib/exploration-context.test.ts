import { describe, expect, it } from "vitest";
import { explorationHref, safeReturnPath } from "./exploration-context";
describe("exploration context", () => {
  it("retains playoff context and a bounded return destination", () => {
    const url = new URL(
      explorationHref("/teams/12?season=20252026", "/games/2025030416", ""),
      "http://local",
    );
    expect(url.searchParams.get("phase")).toBe("playoffs");
    expect(url.searchParams.get("returnTo")).toBe("/games/2025030416");
  });
  it("opens career records as careers and keeps the originating filters", () => {
    const url = new URL(
      explorationHref(
        "/players/8447400",
        "/history",
        "section=careers&phase=playoffs&metric=points",
      ),
      "http://local",
    );
    expect(url.searchParams.get("view")).toBe("seasons");
    expect(url.searchParams.get("phase")).toBe("playoffs");
    expect(url.searchParams.get("returnTo")).toContain("metric=points");
  });
  it("preserves explicit destination choices and avoids nesting return URLs", () => {
    const url = new URL(
      explorationHref(
        "/players/12?phase=regular",
        "/teams/1",
        "phase=playoffs&returnTo=%2Fhistory",
      ),
      "http://local",
    );
    expect(url.searchParams.get("phase")).toBe("regular");
    expect(url.searchParams.get("returnTo")).toBe("/teams/1?phase=playoffs");
  });
  it("rejects external and malformed return paths", () => {
    for (const value of [
      "https://example.com",
      "//example.com",
      "/\\example.com",
      "/api/health",
      "javascript:alert(1)",
    ])
      expect(safeReturnPath(value)).toBeNull();
    expect(safeReturnPath("/players?q=Connor&sort=goals")).toBe(
      "/players?q=Connor&sort=goals",
    );
  });
});
