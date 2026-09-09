import { expect, test } from "@playwright/test";

test.use({ httpCredentials: undefined });

test("unauthenticated requests cannot read pages, APIs or cached responses", async ({ playwright }) => {
  // Warm the route with the authorized context first, then try it anonymously.
  const signedIn = await playwright.request.newContext({ baseURL: "http://localhost:3100",
    httpCredentials: { username: "fixture", password: "fixture-only-password" } });
  try { expect((await signedIn.get("/api/seasons")).ok()).toBeTruthy(); }
  finally { await signedIn.dispose(); }
  // Native fetch has no Playwright project credentials or HTTP challenge retries.
  for (const path of ["/", "/api/seasons", "/api/health", "/games/1?_rsc=probe", "/_next/static/probe.js"]) {
    const response = await fetch(`http://localhost:3100${path}`, { headers: { "x-middleware-subrequest": "proxy:proxy:proxy:proxy:proxy" } });
    expect(response.status, path).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("Basic");
    expect(response.headers.get("cache-control")).toContain("no-store");
  }
  expect((await fetch("http://localhost:3100/api/ingestion/revalidate", { method: "POST" })).status).toBe(503);
});

test("second user can read statistics", async ({ playwright }) => {
  const partner = await playwright.request.newContext({ baseURL: "http://localhost:3100",
    httpCredentials: { username: "partner", password: "fixture-only-password" } });
  try { expect((await partner.get("/api/seasons")).ok()).toBeTruthy(); }
  finally { await partner.dispose(); }
});
