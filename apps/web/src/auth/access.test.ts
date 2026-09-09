import { scryptSync } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { checkLogin } from "./access";
import { proxy } from "../proxy";

const salt = "a1".repeat(16);
const users = ["tyler", "partner"].map(username => ({ username, salt,
  hash: scryptSync("test-password-long", Buffer.from(salt, "hex"), 64).toString("hex") }));
const authorization = (user = "tyler", password = "test-password-long") => `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
afterEach(() => vi.unstubAllEnvs());
describe("private website access", () => {
  it("fails closed on Vercel even when private-access flag is false", async () => {
    vi.stubEnv("VERCEL", "1"); vi.stubEnv("SPORTSBALL_PRIVATE_ACCESS", "false");
    vi.stubEnv("SPORTSBALL_LOGIN_USERS", "");
    expect((await proxy(new NextRequest("https://site.test/api/health"))).status).toBe(503);
  });
  it("accepts both users and rejects wrong, malformed or missing credentials", async () => {
    vi.stubEnv("SPORTSBALL_LOGIN_USERS", JSON.stringify(users));
    for (const name of ["tyler", "partner"]) expect(await checkLogin(authorization(name))).toBe("allowed");
    for (const header of [null, "Basic ???", authorization("other"), authorization("tyler", "wrong"), "Bearer test"])
      expect(await checkLogin(header)).toBe("denied");
  });
  it("rejects duplicate or malformed user configuration", async () => {
    for (const config of [[users[0]], [users[0], users[0]], [{}, {}]]) {
      vi.stubEnv("SPORTSBALL_LOGIN_USERS", JSON.stringify(config));
      expect(await checkLogin(authorization())).toBe("unconfigured");
    }
  });
  it("protects pages, APIs, static and RSC requests and disables shared caching", async () => {
    vi.stubEnv("VERCEL", "1"); vi.stubEnv("SPORTSBALL_LOGIN_USERS", JSON.stringify(users));
    for (const path of ["/", "/games/1?_rsc=test", "/api/seasons", "/_next/static/test.js", "/api/ingestion/revalidate"]) {
      const denied = await proxy(new NextRequest(`https://site.test${path}`));
      expect(denied.status).toBe(401);
      expect(denied.headers.get("www-authenticate")).toContain("Basic");
    }
    const allowed = await proxy(new NextRequest("https://site.test/", { headers: { authorization: authorization() } }));
    expect(allowed.headers.get("x-middleware-next")).toBe("1");
    expect(allowed.headers.get("cache-control")).toContain("no-store");
    expect(allowed.headers.get("vercel-cdn-cache-control")).toBe("no-store");
  });
  it("passes only the exact revalidation POST to its existing bearer-token guard", async () => {
    vi.stubEnv("VERCEL", "1"); vi.stubEnv("SPORTSBALL_LOGIN_USERS", JSON.stringify(users));
    expect((await proxy(new NextRequest("https://site.test/api/ingestion/revalidate", { method: "POST" }))).headers.get("x-middleware-next")).toBe("1");
    expect((await proxy(new NextRequest("https://site.test/api/health", { method: "POST" }))).status).toBe(401);
  });
});
