import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { unstable_cache } from "next/cache";
import { readContext } from "./read-context";

const invocations = new AsyncLocalStorage<string>();

/** Adapter for existing reference-data cache declarations. */
export function trackedCache<Args extends unknown[], Value>(
  loader: (...args: Args) => Promise<Value>, keys: string[],
  options: { revalidate: number; tags?: string[] },
) {
  return sharedRead(keys.join(":"), loader, options.revalidate, options.tags);
}

/** Short-lived shared reads; hits include stale values served during revalidation. */
export function sharedRead<Args extends unknown[], Value>(
  name: string,
  loader: (...args: Args) => Promise<Value>,
  seconds = 300,
  tags: string[] = [],
): (...args: Args) => Promise<Value> {
  const cached = unstable_cache(async (...args: Args) => ({
    value: await loader(...args),
    generatedBy: invocations.getStore(),
  }), [name, "envelope-v2"], { revalidate: seconds, tags });
  return async (...args) => {
    const startedAt = Date.now();
    const id = randomUUID();
    const result = await invocations.run(id, () => cached(...args));
    if (process.env.SPORTSBALL_READ_TELEMETRY === "1") {
      console.info(JSON.stringify({ event: "data-cache-read", name,
        status: result.generatedBy === id ? "fill" : "hit",
        durationMs: Date.now() - startedAt, route: readContext()?.route,
      }));
    }
    return result.value;
  };
}
