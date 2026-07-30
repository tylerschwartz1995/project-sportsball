import { describe, expect, it } from "vitest";

import { parseNhlId } from "@/contracts/entity";

describe("parseNhlId", () => {
  it.each([
    ["12", 12],
    ["8478402", 8478402],
    ["1", 1],
  ])("accepts positive integer identifiers", (value, expected) => {
    expect(parseNhlId(value)).toBe(expected);
  });

  it.each([undefined, null, "", "0", "-1", "12.5", "abc", "12345678901"])(
    "rejects %s",
    (value) => {
      expect(parseNhlId(value)).toBeNull();
    },
  );
});
