import { defineConfig } from "@playwright/test";
import smoke from "./playwright.smoke.config";
const servers = Array.isArray(smoke.webServer) ? smoke.webServer : [];
export default defineConfig({
  ...smoke,
  testMatch: ["passkeys.spec.ts"],
  projects: [{ name: "passkeys-chromium" }],
  use: { ...smoke.use, storageState: { cookies: [], origins: [] } },
  webServer: [
    servers[0],
    { ...servers[1], command: "node e2e/setup-auth.mjs && npm run start -- --port 3100",
      env: { ...(servers[1] as { env?: Record<string, string> }).env,
        SPORTSBALL_PASSKEYS_ENABLED: "true",
        SPORTSBALL_AUTH_DATABASE_URL: process.env.SPORTSBALL_WEB_DATABASE_URL ?? "",
        SPORTSBALL_AUTH_SECRET: "fixture-only-passkey-secret-at-least-32-characters",
      },
    },
  ],
});
