import "server-only";
import { NEON_AUTH_SESSION_COOKIE_NAME } from "@neondatabase/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { requestAuth } from "./neon";
export { requestAuth } from "./neon";
import { passkeyAuth, passkeysEnabled } from "./passkeys";
import { allowedUser, authConfiguration } from "./access";

export async function checkSession(request: NextRequest, response: NextResponse): Promise<"allowed" | "denied" | "unavailable"> {
  if (passkeysEnabled()) {
    if (!request.cookies.get("__Secure-sportsball.session_token")?.value) return "denied";
    try {
      const result = await passkeyAuth().api.getSession({ headers: request.headers, asResponse: true });
      if (!result.ok) return result.status === 401 ? "denied" : "unavailable";
      const data = await result.json();
      const expiresAt = data?.session ? new Date(data.session.expiresAt).getTime() : NaN;
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() || !allowedUser(data?.user, authConfiguration().emails)) return "denied";
      for (const cookie of result.headers.getSetCookie()) response.headers.append("Set-Cookie", cookie);
      return "allowed";
    } catch { return "unavailable"; }
  }
  const { auth, config } = requestAuth(request, response);
  if (!request.cookies.get(NEON_AUTH_SESSION_COOKIE_NAME)?.value) return "denied";
  try {
    // Revalidate with Neon: revoked sessions and account changes take effect immediately.
    const { data, error } = await auth.getSession({ query: { disableCookieCache: "true" } });
    if (error) return error.status === 401 ? "denied" : "unavailable";
    const expiresAt = data?.session ? new Date(data.session.expiresAt).getTime() : NaN;
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return "denied";
    return allowedUser(data?.user, config.emails) ? "allowed" : "denied";
  } catch { return "unavailable"; }
}

export function privateResponse(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("CDN-Cache-Control", "no-store");
  response.headers.set("Vercel-CDN-Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
