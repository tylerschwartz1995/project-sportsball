import { scryptSync } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

const password = "fixture-only-password";
const salt = "ab".repeat(16);
const users = ["fixture", "partner"].map(username => ({ username, salt,
  hash: scryptSync(password, Buffer.from(salt, "hex"), 64).toString("hex") }));

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["fixture-smoke.spec.ts", "private-access.spec.ts"],
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    httpCredentials: { username: "fixture", password },
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: {
    env: { SPORTSBALL_PRIVATE_ACCESS: "true", SPORTSBALL_LOGIN_USERS: JSON.stringify(users) },
    command: "npm run start -- --port 3100",
    url: "http://localhost:3100/api/seasons",
    reuseExistingServer: false,
  },
});
