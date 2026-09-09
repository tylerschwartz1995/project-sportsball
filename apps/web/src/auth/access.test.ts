import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { allowedUser, authConfiguration } from "./access";
import { proxy } from "../proxy";
import { POST } from "../app/api/auth/[action]/route";

const origin = "https://sportsball.test";
const user = { id: "one", email: "one@example.com", emailVerified: true };
const session = { id: "session", expiresAt: new Date(Date.now() + 3600000).toISOString() };
const fetchMock = vi.fn();
const request = (path: string, cookie = true) => new NextRequest(origin + path, { headers: cookie ? { cookie: "__Secure-neon-auth.session_token=test" } : {} });
beforeEach(() => {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("SPORTSBALL_ALLOWED_EMAILS", "one@example.com,two@example.com");
  vi.stubEnv("NEON_AUTH_BASE_URL", "https://ep-test.neonauth.us-west-2.aws.neon.tech/neondb/auth");
  vi.stubEnv("NEON_AUTH_COOKIE_SECRET", "test-only-secret-with-at-least-32-characters");
  vi.stubEnv("SPORTSBALL_AUTH_ORIGIN", origin);
  fetchMock.mockReset().mockImplementation(async () => Response.json({ user, session }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Neon private access", () => {
  it("requires two distinct valid addresses and safe URLs", () => {
    for (const value of ["", "one@example.com", "ONE@example.com,one@example.com", "bad,two@example.com"]) {
      vi.stubEnv("SPORTSBALL_ALLOWED_EMAILS", value); expect(() => authConfiguration()).toThrow();
    }
    vi.stubEnv("SPORTSBALL_ALLOWED_EMAILS", "one@example.com,two@example.com");
    vi.stubEnv("NEON_AUTH_BASE_URL", "http://localhost:3200"); expect(() => authConfiguration()).toThrow();
  });
  it("requires a verified allowlisted account", () => {
    for (const email of ["one@example.com", "TWO@example.com"]) expect(allowedUser({ email, emailVerified: true }, authConfiguration().emails)).toBe(true);
    for (const value of [null, {}, { ...user, emailVerified: false }, { ...user, email: "other@example.com" }]) expect(allowedUser(value, authConfiguration().emails)).toBe(false);
  });
  it("fails closed on Vercel without configuration", async () => {
    vi.stubEnv("SPORTSBALL_PRIVATE_ACCESS", "false"); vi.stubEnv("SPORTSBALL_ALLOWED_EMAILS", "");
    expect((await proxy(request("/api/seasons", false))).status).toBe(503);
  });
  it("does not wake Neon for anonymous requests and protects APIs and RSC", async () => {
    for (const path of ["/api/seasons", "/api/health", "/api/auth/admin"]) expect((await proxy(request(path, false))).status).toBe(401);
    for (const path of ["/", "/games/1?_rsc=probe", "/_next/data/test.json"]) expect((await proxy(request(path, false))).headers.get("location")).toBe(origin + "/login");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("checks provider sessions, disables shared caches, and bypasses cookie cache", async () => {
    const response = await proxy(request("/api/seasons"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(fetchMock.mock.calls[0][0]).toContain("disableCookieCache=true");
  });
  it("rejects revoked, expired, outsider and unverified sessions", async () => {
    for (const data of [null, { user, session: { ...session, expiresAt: "2000-01-01" } }, { session, user: { ...user, email: "other@example.com" } }, { session, user: { ...user, emailVerified: false } }]) {
      fetchMock.mockImplementation(async () => Response.json(data));
      expect((await proxy(request("/api/seasons"))).status).toBe(401);
    }
  });
  it("rejects a forged session and handles provider outages", async () => {
    fetchMock.mockImplementation(async () => Response.json({ message: "invalid" }, { status: 401 }));
    expect((await proxy(request("/api/seasons"))).status).toBe(401);
    fetchMock.mockImplementation(async () => { throw new Error("offline"); });
    expect((await proxy(request("/api/seasons"))).status).toBe(503);
  });
  it("exempts only login, build assets and the bearer-guarded machine POST", async () => {
    for (const path of ["/login", "/_next/static/test.js"]) expect((await proxy(request(path, false))).headers.get("x-middleware-next")).toBe("1");
    expect((await proxy(new NextRequest(origin + "/api/ingestion/revalidate", { method: "POST" }))).headers.get("x-middleware-next")).toBe("1");
    expect((await proxy(request("/api/ingestion/revalidate", false))).status).toBe(401);
  });
});

async function post(action: string, body: unknown, requestOrigin = origin) {
  return POST(new NextRequest(origin + "/api/auth/" + action, { method: "POST", headers: { origin: requestOrigin, "content-type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ action }) });
}
describe("email login endpoints", () => {
  it("rejects cross-site requests and unknown actions", async () => {
    expect((await post("send-code", { email: user.email }, "https://attacker.test")).status).toBe(403);
    expect((await post("admin", {})).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("sends sign-in codes only for approved addresses without exposing the allowlist", async () => {
    expect((await post("send-code", { email: "outsider@example.com" })).status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await post("send-code", { email: "ONE@example.com" })).status).toBe(200);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: user.email, type: "sign-in" });
  });
  it("does not accept malformed codes or unverified provider results", async () => {
    expect((await post("verify-code", { email: user.email, otp: "bad" })).status).toBe(400);
    fetchMock.mockImplementation(async () => Response.json({ user: { ...user, emailVerified: false } }));
    expect((await post("verify-code", { email: user.email, otp: "123456" })).status).toBe(401);
  });
});
