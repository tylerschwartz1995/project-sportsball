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

test("security headers authorize app scripts and block injected scripts", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", message => {
    if (message.type() === "error" && /content security policy/i.test(message.text())) violations.push(message.text());
  });
  const response = await page.goto("/login");
  const policy = response!.headers()["content-security-policy"];
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).not.toContain("unsafe-eval");
  expect(response!.headers()["x-frame-options"]).toBe("DENY");
  expect(response!.headers()["x-content-type-options"]).toBe("nosniff");
  const nonce = /'nonce-([^']+)'/.exec(policy)![1];
  expect(await page.locator("#sportsball-theme-bootstrap").evaluate(element => (element as HTMLScriptElement).nonce)).toBe(nonce);
  await page.getByLabel("Email Address").fill("one@example.com");
  await page.getByRole("button", { name: "Send Code", exact: true }).click();
  await expect(page.getByLabel("Email Code")).toBeVisible();
  expect(violations).toEqual([]);
  // Insert into the HTML parser stream; DevTools evaluation is privileged.
  await page.route("**/login", async route => {
    const upstream = await route.fetch();
    const body = (await upstream.text()).replace("</head>", "<script>document.documentElement.dataset.injected = 'yes'</script></head>");
    await route.fulfill({ response: upstream, body });
  });
  await page.goto("/login");
  expect(await page.locator("html").getAttribute("data-injected")).toBeNull();
  const second = await page.request.get("/login", { headers: { "x-nonce": "attacker", "content-security-policy": "script-src 'unsafe-inline'" } });
  expect(second.headers()["content-security-policy"]).not.toContain(nonce);
  expect(second.headers()["content-security-policy"]).not.toContain("attacker");
});
