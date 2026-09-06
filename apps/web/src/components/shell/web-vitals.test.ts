import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const reportHook = vi.hoisted(() => vi.fn());
vi.mock("next/web-vitals", () => ({ useReportWebVitals: reportHook }));

describe("best-effort web vitals delivery", () => {
  beforeEach(() => {
    vi.resetModules();
    reportHook.mockReset();
    vi.stubEnv("NEXT_PUBLIC_WEB_VITALS_SAMPLE_RATE", "1");
    vi.stubGlobal("window", { location: { pathname: "/teams/26", search: "?secret=private" } });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("falls back to fetch when the browser refuses to queue a beacon", async () => {
    const sendBeacon = vi.fn().mockReturnValue(false);
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("navigator", { sendBeacon });
    vi.stubGlobal("fetch", fetch);
    const { WebVitals } = await import("./web-vitals");
    WebVitals();
    reportHook.mock.calls[0][0]({ id: "x", name: "LCP", value: 10 });
    expect(sendBeacon).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][1].body).not.toContain("private");
  });

  it("handles a rejected fallback request", async () => {
    vi.stubGlobal("navigator", {});
    const fetch = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetch);
    const { WebVitals } = await import("./web-vitals");
    WebVitals();
    reportHook.mock.calls[0][0]({ id: "x", name: "LCP", value: 10 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetch).toHaveBeenCalledOnce();
  });
});
