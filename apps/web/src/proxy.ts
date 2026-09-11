import { NextRequest, NextResponse } from "next/server";
import { authConfiguration, privateAccessRequired } from "./auth/access";
import { checkSession, privateResponse } from "./auth/server";

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const development = process.env.NODE_ENV === "development";
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'", // Charts and theme controls use inline styles.
    "img-src 'self' data: https://assets.nhle.com",
    "font-src 'self'",
    `connect-src 'self'${development ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  const headers = new Headers(request.headers);
  // Replace any supplied nonce/CSP: only the server chooses script authorization.
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  const next = () => NextResponse.next({ request: { headers } });
  const response = await authorize(request, next);
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

async function authorize(request: NextRequest, next: () => NextResponse) {
  if (!privateAccessRequired()) return next();
  const path = request.nextUrl.pathname;
  if (path === "/api/ingestion/revalidate" && request.method === "POST") return privateResponse(next());
  // Only public login assets: never exempt _next/data, image optimization or arbitrary APIs.
  if (path.startsWith("/_next/static/") || path === "/favicon.ico") return next();
  try { authConfiguration(); } catch {
    return privateResponse(new NextResponse("Sign-in is not configured.", { status: 503 }));
  }
  if (path === "/login" || ["/api/auth/send-code", "/api/auth/verify-code", "/api/auth/sign-out"].includes(path)) {
    return privateResponse(next());
  }
  const response = next();
  const result = await checkSession(request, response);
  if (result === "allowed") return privateResponse(response);
  if (result === "unavailable") return privateResponse(new NextResponse("Sign-in is temporarily unavailable.", { status: 503 }));
  const denied = path.startsWith("/api/") || request.method !== "GET"
    ? new NextResponse("Sign in to Sportsball.", { status: 401 })
    : NextResponse.redirect(new URL("/login", request.url));
  return privateResponse(denied);
}

export const config = { matcher: "/:path*" };
