import "server-only";
import { createAuthServer, extractNeonAuthCookies, NEON_AUTH_SESSION_COOKIE_NAME } from "@neondatabase/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { allowedUser, authConfiguration } from "./access";

export function requestAuth(request: NextRequest, response: NextResponse) {
  const config = authConfiguration();
  const auth = createAuthServer({
    baseUrl: config.baseUrl,
    cookieSecret: config.secret,
    context: () => ({
      getCookies: () => extractNeonAuthCookies(request.headers),
      getHeader: (name) => request.headers.get(name),
      getOrigin: () => config.origin,
      getFramework: () => "nextjs",
      setCookie: (name, value, options) => { response.cookies.set(name, value, options); },
    }),
  });
  return { auth, config };
}

export async function checkSession(request: NextRequest, response: NextResponse): Promise<"allowed" | "denied" | "unavailable"> {
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
