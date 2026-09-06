import { beforeEach, expect, it, vi } from "vitest";
const read = vi.hoisted(() => vi.fn());
vi.mock("@/data/history-supplement", () => ({ getHistorySupplement: read }));
import { GET } from "./route";
beforeEach(() => read.mockReset());

it("rejects invalid phase or view before querying", async () => {
  for (const query of ["", "phase=regular&view=unknown", "phase=unknown&view=records"]) {
    expect((await GET(new Request(`http://localhost/api/history/supplement?${query}`))).status).toBe(400);
  }
  expect(read).not.toHaveBeenCalled();
});
it("keeps playoff qualification separate and caches only successful responses", async () => {
  read.mockResolvedValueOnce({ progression: [] });
  const request = new Request("http://localhost/api/history/supplement?phase=playoffs&view=records");
  const response = await GET(request);
  expect(read).toHaveBeenCalledWith(3, "records");
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("max-age=300");
  read.mockRejectedValueOnce(new Error("private database detail"));
  const unavailable = await GET(request);
  expect(unavailable.status).toBe(503);
  expect(await unavailable.text()).not.toContain("private");
});
