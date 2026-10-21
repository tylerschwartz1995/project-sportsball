import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
const fixtureUrl = process.env.SPORTSBALL_WEB_DATABASE_URL;
if (process.env.SPORTSBALL_RUN_WEB_FIXTURE_TESTS !== "1" || !fixtureUrl || !new URL(fixtureUrl).pathname.endsWith("_test") || !["localhost", "127.0.0.1"].includes(new URL(fixtureUrl).hostname)) {
  throw new Error("Passkey tests require an isolated local fixture database ending in _test");
}
async function emailLogin(page: Page) {
  await page.goto("/login");
  await page.screenshot({ path: "/tmp/sportsball-passkey-login.png" });
  await page.getByRole("button", { name: "First Visit or Use Email" }).click();
  await page.getByLabel("Email Address").fill("one@example.com");
  await page.getByRole("button", { name: "Send Code", exact: true }).click();
  await page.getByLabel("Email Code").fill("123456");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/account\/security\?setup=1/);
}

test("enroll, use a passkey, reopen browser, revoke, recover, and remove", async ({ page, browser, context }) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", { options: {
    protocol: "ctap2", transport: "internal", hasResidentKey: true,
    hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true,
  } });
  await emailLogin(page);
  await page.getByRole("button", { name: "Create a Passkey", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Passkey saved");
  await page.getByRole("button", { name: "Sign Out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/seasons")).status()).toBe(401);
  await page.getByRole("button", { name: "Sign In with a Passkey" }).click();
  await expect(page).toHaveURL(/\/games$/);
  const state = await context.storageState();
  const cookie = state.cookies.find(cookie => cookie.name === "__Secure-sportsball.session_token");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.secure).toBe(true);
  expect(cookie?.expires).toBeGreaterThan(Date.now() / 1000 + 29 * 86400);
  // A browser restart retains persistent cookies, but discards session cookies.
  const reopened = await browser.newContext({ storageState: { cookies: state.cookies.filter(c => c.expires > Date.now() / 1000), origins: [] } });
  const returning = await reopened.newPage();
  try {
    await returning.goto("http://localhost:3100/login");
    await expect(returning).toHaveURL(/\/games$/);
    await page.goto("/account/security");
    await page.getByRole("button", { name: "Sign Out", exact: true }).click();
    await returning.goto("http://localhost:3100/games");
    await expect(returning).toHaveURL(/\/login$/);
    // Email still works with a lost/unavailable passkey.
    await emailLogin(page);
    const pool = new Pool({ connectionString: process.env.SPORTSBALL_WEB_DATABASE_URL });
    try {
      await pool.query('UPDATE auth_session SET "updatedAt" = now() - interval \'2 days\', "expiresAt" = now() + interval \'28 days\'');
      expect((await page.request.get("/api/seasons")).status()).toBe(200);
      const renewed = (await context.cookies()).find(c => c.name === "__Secure-sportsball.session_token");
      expect(renewed?.expires).toBeGreaterThan(Date.now() / 1000 + 29 * 86400);
      await pool.query("UPDATE auth_user SET email = 'removed@example.com' WHERE email = 'one@example.com'");
      expect((await page.request.get("/api/seasons")).status()).toBe(401);
      await pool.query("UPDATE auth_user SET email = 'one@example.com' WHERE email = 'removed@example.com'");
      await pool.query('UPDATE auth_session SET "expiresAt" = now() - interval \'1 minute\'');
    }
    finally { await pool.end(); }
    expect((await page.request.get("/api/seasons")).status()).toBe(401);
    await emailLogin(page);
    const other = await browser.newContext({ baseURL: "http://localhost:3100" });
    try {
      await emailLogin(await other.newPage());
      await page.getByRole("button", { name: "Sign Out Other Devices", exact: true }).click();
      await expect(page.getByRole("status")).toContainText("Signed out of other devices");
      expect((await other.request.get("http://localhost:3100/api/seasons")).status()).toBe(401);
      expect((await page.request.get("/api/seasons")).status()).toBe(200);
    } finally { await other.close(); }
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: "/tmp/sportsball-passkey-settings-mobile.png" });
    const removeButtons = page.getByRole("button", { name: "Remove", exact: true });
    for (let remaining = await removeButtons.count(); remaining > 0; remaining--) {
      await removeButtons.first().click();
      await expect(page.getByRole("status")).toContainText("Passkey removed");
      await expect(removeButtons).toHaveCount(remaining - 1);
    }
  } finally { await reopened.close(); }
});

test("rejects anonymous management, outsiders, cross-origin login and unused auth routes", async ({ request }) => {
  const origin = "http://localhost:3100";
  expect((await request.post("/api/passkey/email-code", { headers: { origin }, data: { email: "outsider@example.com", otp: "123456" } })).status()).toBe(401);
  expect((await request.post("/api/passkey/email-code", { headers: { origin: "https://other.test" }, data: { email: "one@example.com", otp: "123456" } })).status()).toBe(403);
  expect((await request.get("/api/passkey/passkey/list-user-passkeys")).status()).toBe(401);
  expect((await request.post("/api/passkey/sign-up/email", { headers: { origin }, data: {} })).status()).toBe(401);
});
