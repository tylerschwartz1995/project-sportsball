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


it("shares one pending request and releases it after completion", async () => {
  let resolve!: (value: number) => void;
  const loader = vi.fn(() => new Promise<number>(done => { resolve = done; }));
  const read = sharedRead("concurrent", loader);
  const first = read();
  const second = read();
  expect(second).toBe(first);
  resolve(42);
  expect(await first).toBe(42);
  const later = read();
  expect(later).not.toBe(first);
  expect(await later).toBe(42);
});

it("releases a failed pending request", async () => {
  const loader = vi.fn(async () => { throw new Error("read failed"); });
  const read = sharedRead("failure", loader);
  const first = read();
  expect(read()).toBe(first);
  await expect(first).rejects.toThrow("read failed");
  const later = read();
  expect(later).not.toBe(first);
  await expect(later).rejects.toThrow("read failed");
});
