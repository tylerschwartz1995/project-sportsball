import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

const reads = new AsyncLocalStorage<{ route: string }>();

/** Only call with a fixed route template, never a URL or user query. */
export function withReadContext<T>(route: string, work: () => T): T {
  return reads.run({ route }, work);
}

export function readContext() {
  return reads.getStore();
}
