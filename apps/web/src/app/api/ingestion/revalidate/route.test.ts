import { afterEach, describe, expect, it, vi } from "vitest";

const revalidate = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidateTag: revalidate }));
import { POST } from "./route";

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("ingestion cache revalidation", () => {
  it("is disabled without configuration and rejects missing or incorrect credentials", async () => {
    vi.stubEnv("SPORTSBALL_REVALIDATION_TOKEN", "");
    expect((await POST(new Request("http://localhost/api/ingestion/revalidate"))).status).toBe(503);
    vi.stubEnv("SPORTSBALL_REVALIDATION_TOKEN", "test-token");
    for (const authorization of ["", "Bearer wrong-token", "Bearer test-tokem"]) {
      expect((await POST(new Request("http://localhost/api/ingestion/revalidate", {
        method: "POST", headers: { authorization },
      }))).status).toBe(401);
    }
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("expires all shared ingestion reads for an authenticated runner", async () => {
    vi.stubEnv("SPORTSBALL_REVALIDATION_TOKEN", "test-token");
    const response = await POST(new Request("http://localhost/api/ingestion/revalidate", {
      method: "POST", headers: { authorization: "Bearer test-token" },
    }));
    expect(response.status).toBe(200);
    expect(revalidate).toHaveBeenCalledWith("ingestion", { expire: 0 });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
