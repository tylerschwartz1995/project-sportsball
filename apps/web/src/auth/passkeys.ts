import "server-only";
import { betterAuth } from "better-auth";
import { createAuthEndpoint, APIError } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { passkey } from "@better-auth/passkey";
import { Pool } from "pg";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authConfiguration, allowedUser } from "./access";
import { requestAuth } from "./neon";
import { connectionOptions } from "@/data/connection-options";

export const passkeysEnabled = () => process.env.SPORTSBALL_PASSKEYS_ENABLED === "true";

function createPasskeyAuth() {
  const config = authConfiguration();
  const databaseUrl = process.env.SPORTSBALL_AUTH_DATABASE_URL;
  const secret = process.env.SPORTSBALL_AUTH_SECRET;
  if (!databaseUrl || !secret || secret.length < 32) throw new Error("Passkey authentication is not configured");
  const url = new URL(databaseUrl);
  if (process.env.VERCEL === "1" && (!url.hostname.endsWith(".neon.tech") || url.username !== "sportsball_auth" || !url.password)) {
    throw new Error("Passkeys require the dedicated authentication database role");
  }
  const pool = new Pool({ ...connectionOptions(databaseUrl, false), max: 2 });
  pool.on("error", () => console.warn("Authentication database connection failed"));
  return betterAuth({
    appName: "Sportsball", baseURL: config.origin, basePath: "/api/passkey", secret,
    database: pool, trustedOrigins: [config.origin],
    advanced: { cookiePrefix: "sportsball", useSecureCookies: true },
    user: { modelName: "auth_user" },
    account: { modelName: "auth_account" },
    verification: { modelName: "auth_verification" },
    session: { modelName: "auth_session", expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: "database", modelName: "auth_rate_limit", window: 60, max: 30 },
    databaseHooks: {
      user: { create: { before: async user => {
        if (!allowedUser(user, authConfiguration().emails)) return false;
        return { data: user };
      } } },
      session: { create: { before: async session => {
        const result = await pool.query('SELECT email, "emailVerified" FROM auth_user WHERE id = $1', [session.userId]);
        if (!allowedUser(result.rows[0], authConfiguration().emails)) return false;
        return { data: session };
      } } },
    },
    plugins: [passkey({ rpName: "Sportsball", rpID: new URL(config.origin).hostname, origin: config.origin,
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
      schema: { passkey: { modelName: "auth_passkey" } } }), {
      id: "approved-email-recovery",
      endpoints: {
        emailCode: createAuthEndpoint("/email-code", {
          method: "POST", body: z.object({ email: z.string().email().max(254), otp: z.string().regex(/^\d{6}$/) }),
        }, async ctx => {
          const email = ctx.body.email.trim().toLowerCase();
          if (!authConfiguration().emails.includes(email) || !ctx.request) throw new APIError("UNAUTHORIZED", { message: "Unable to sign in with that code." });
          // Neon verifies the one-time code. Its session is not used as a
          // substitute for the app's own passkey/session checks.
          const { auth } = requestAuth(new NextRequest(ctx.request.url, { headers: ctx.request.headers }), new NextResponse());
          const result = await auth.signIn.emailOtp({ email, otp: ctx.body.otp });
          if (result.error || !allowedUser(result.data?.user, authConfiguration().emails) || result.data?.user.email.toLowerCase() !== email) {
            throw new APIError("UNAUTHORIZED", { message: "Unable to sign in with that code." });
          }
          const existing = await ctx.context.internalAdapter.findUserByEmail(email);
          const user = existing?.user ?? await ctx.context.internalAdapter.createUser({ email, emailVerified: true, name: "" });
          if (!allowedUser(user, authConfiguration().emails)) throw new APIError("UNAUTHORIZED");
          const session = await ctx.context.internalAdapter.createSession(user.id);
          if (!session) throw new APIError("UNAUTHORIZED");
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ ok: true });
        }),
      },
    }],
  });
}
let instance: ReturnType<typeof createPasskeyAuth> | undefined;
export function passkeyAuth() { return instance ??= createPasskeyAuth(); }

// Only expose the actions used by this private application. In particular,
// no public signup, email changes, account linking, or password endpoints.
export const passkeyPaths = new Set([
  "/email-code", "/get-session", "/sign-out", "/revoke-other-sessions",
  "/passkey/generate-register-options", "/passkey/verify-registration",
  "/passkey/generate-authenticate-options", "/passkey/verify-authentication",
  "/passkey/list-user-passkeys", "/passkey/delete-passkey",
]);

export const publicPasskeyPaths = new Set([
  "/email-code", "/sign-out", "/passkey/generate-authenticate-options",
  "/passkey/verify-authentication",
]);
