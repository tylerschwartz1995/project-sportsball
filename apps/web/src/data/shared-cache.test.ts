import { afterEach, expect, it, vi } from "vitest";
vi.mock("next/cache", () => ({ unstable_cache: (loader: (...args: unknown[]) => Promise<unknown>) => {
  const entries = new Map<string, Promise<unknown>>();
  return (...args: unknown[]) => {
    const key = JSON.stringify(args);
    if (!entries.has(key)) entries.set(key, loader(...args));
    return entries.get(key);
  };
} }));
import { sharedRead } from "./shared-cache";
import { withReadContext } from "./read-context";

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

it("separates parameterized reads and identifies fills and hits in the calling route", async () => {
  vi.stubEnv("SPORTSBALL_READ_TELEMETRY", "1");
  const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
  const loader = vi.fn(async (id: number) => ({ id }));
  const read = sharedRead("test", loader);
  expect(await withReadContext("players/profile", () => read(1))).toEqual({ id: 1 });
  expect(await withReadContext("players/comparison", () => read(1))).toEqual({ id: 1 });
  expect(await read(2)).toEqual({ id: 2 });
  expect(loader).toHaveBeenCalledTimes(2);
  const logs = info.mock.calls.map(([line]) => JSON.parse(line));
  expect(logs[0]).toMatchObject({ status: "fill", route: "players/profile" });
  expect(logs[1]).toMatchObject({ status: "hit", route: "players/comparison" });
});
