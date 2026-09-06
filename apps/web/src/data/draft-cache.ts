import "server-only";
import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";
import type { DraftAnalytics, DraftAnalyticsOptions } from "@/contracts/draft";
import { getDraftAnalytics } from "./drafts";
import { sharedRead } from "./shared-cache";

const compress = promisify(gzip);
const decompress = promisify(gunzip);
// The all-years archive exceeds Next's per-entry cache limit as JSON. Store a
// compressed server-only value; neither the archive nor base64 reaches clients.
const read = sharedRead("draft-projection-v1", async (
  options: DraftAnalyticsOptions, view: "board" | "outcomes" | "classes" | "teams",
) => (await compress(JSON.stringify(await getDraftAnalytics(options, view)))).toString("base64"), 300, ["statistics", "drafts"]);

export async function getCachedDraftAnalytics(
  options: DraftAnalyticsOptions, view: "board" | "outcomes" | "classes" | "teams",
): Promise<DraftAnalytics> {
  return JSON.parse((await decompress(Buffer.from(await read(options, view), "base64"))).toString());
}
