import { NextRequest, NextResponse } from "next/server";
import { authConfiguration, privateAccessRequired } from "./auth/access";
import { checkSession, privateResponse } from "./auth/server";

export async function proxy(request: NextRequest) {
  if (!privateAccessRequired()) return NextResponse.next();
  const path = request.nextUrl.pathname;
  if (path === "/api/ingestion/revalidate" && request.method === "POST") return privateResponse(NextResponse.next());
  // Only public login assets: never exempt _next/data, image optimization or arbitrary APIs.
  if (path.startsWith("/_next/static/") || path === "/favicon.ico") return NextResponse.next();
  try { authConfiguration(); } catch {
    return privateResponse(new NextResponse("Sign-in is not configured.", { status: 503 }));
  }
  if (path === "/login" || ["/api/auth/send-code", "/api/auth/verify-code", "/api/auth/sign-out"].includes(path)) {
    return privateResponse(NextResponse.next());
  }
  const response = NextResponse.next();
  const result = await checkSession(request, response);
  if (result === "allowed") return privateResponse(response);
  if (result === "unavailable") return privateResponse(new NextResponse("Sign-in is temporarily unavailable.", { status: 503 }));
  const denied = path.startsWith("/api/") || request.method !== "GET"
    ? new NextResponse("Sign in to Sportsball.", { status: 401 })
    : NextResponse.redirect(new URL("/login", request.url));
  return privateResponse(denied);
}

export const config = { matcher: "/:path*" };
