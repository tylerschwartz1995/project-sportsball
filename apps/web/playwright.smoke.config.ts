import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["fixture-smoke.spec.ts", "private-access.spec.ts"],
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    storageState: { cookies: [{ name: "__Secure-neon-auth.session_token", value: "fixture", domain: "localhost", path: "/", secure: true, httpOnly: true, sameSite: "Lax", expires: -1 }], origins: [] },
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: [{ command: "node e2e/auth-provider.mjs", url: "http://localhost:3200", reuseExistingServer: false }, {
    env: { SPORTSBALL_PRIVATE_ACCESS: "true", SPORTSBALL_ALLOWED_EMAILS: "one@example.com,two@example.com", NEON_AUTH_BASE_URL: "http://localhost:3200", NEON_AUTH_COOKIE_SECRET: "fixture-only-secret-at-least-32-characters", SPORTSBALL_AUTH_ORIGIN: "http://localhost:3100" },
    command: "npm run start -- --port 3100",
    url: "http://localhost:3100/login",
    reuseExistingServer: false,
  }],
});
