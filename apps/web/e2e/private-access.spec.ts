import { expect, test } from "@playwright/test";
test.use({ storageState: { cookies: [], origins: [] } });

test("anonymous visitors cannot read APIs, cached responses or RSC", async ({ playwright }) => {
  const signedIn = await playwright.request.newContext({ extraHTTPHeaders: { cookie: "__Secure-neon-auth.session_token=fixture" } });
  try { expect((await signedIn.get("http://localhost:3100/api/seasons")).ok()).toBeTruthy(); }
  finally { await signedIn.dispose(); }
  for (const path of ["/", "/api/seasons", "/api/health", "/games/1?_rsc=probe", "/_next/data/probe.json"]) {
    const response = await fetch(`http://localhost:3100${path}`, { redirect: "manual", headers: { "x-middleware-subrequest": "proxy:proxy:proxy:proxy:proxy" } });
    expect(response.status, path).toBe(path.startsWith("/api/") ? 401 : 307);
    expect(response.headers.get("cache-control")).toContain("no-store");
  }
  expect((await fetch("http://localhost:3100/api/ingestion/revalidate", { method: "POST" })).status).toBe(503);
});

test("both approved users can read statistics", async () => {
  for (const token of ["fixture", "partner"]) {
    const response = await fetch("http://localhost:3100/api/seasons", { headers: { cookie: `__Secure-neon-auth.session_token=${token}` } });
    expect(response.ok).toBeTruthy();
  }
});

test("email code login and logout work through the actual SDK", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill("one@example.com");
  await page.getByRole("button", { name: "Send Code", exact: true }).click();
  await page.getByLabel("Email Code").fill("000000");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Unable to sign in");
  await page.getByLabel("Email Code").fill("123456");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3100/");
  await page.getByRole("button", { name: "Sign Out", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3100/login");
  expect((await page.request.get("/api/seasons")).status()).toBe(401);
});
