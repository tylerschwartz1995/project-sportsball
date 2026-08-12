import { describe, expect, it } from "vitest";

import {
  mapShotX,
  mapShotY,
  shotNavigationIndex,
} from "@/lib/shot-map";

describe("shot map geometry", () => {
  it("maps regulation half-rink landmarks to a consistent three-pixel scale", () => {
    expect(mapShotX(0)).toBe(10);
    expect(mapShotX(25)).toBe(85);
    expect(mapShotX(89)).toBe(277);
    expect(mapShotX(100)).toBe(310);
    expect(mapShotY(42.5)).toBe(10);
    expect(mapShotY(0)).toBe(137.5);
    expect(mapShotY(-42.5)).toBe(265);
  });

  it("keeps provider coordinates inside the visible rink", () => {
    expect(mapShotX(-10)).toBe(10);
    expect(mapShotX(110)).toBe(310);
    expect(mapShotY(50)).toBe(10);
    expect(mapShotY(-50)).toBe(265);
  });
});

describe("shot map keyboard navigation", () => {
  it("moves through shots with arrow keys and wraps at the ends", () => {
    expect(shotNavigationIndex(1, "ArrowRight", 3)).toBe(2);
    expect(shotNavigationIndex(2, "ArrowDown", 3)).toBe(0);
    expect(shotNavigationIndex(1, "ArrowLeft", 3)).toBe(0);
    expect(shotNavigationIndex(0, "ArrowUp", 3)).toBe(2);
  });

  it("supports first and last shot shortcuts", () => {
    expect(shotNavigationIndex(2, "Home", 5)).toBe(0);
    expect(shotNavigationIndex(2, "End", 5)).toBe(4);
  });

  it("ignores unrelated keys and empty maps", () => {
    expect(shotNavigationIndex(0, "Enter", 3)).toBeNull();
    expect(shotNavigationIndex(0, "ArrowRight", 0)).toBeNull();
  });
});
