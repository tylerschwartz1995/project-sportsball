import { NextRequest, NextResponse } from "next/server";
import { checkLogin, privateAccessRequired } from "./auth/access";

export async function proxy(request: NextRequest) {
  if (!privateAccessRequired()) return NextResponse.next();

  // This one machine endpoint authenticates its own bearer token and returns no data.
  const machineRequest = request.nextUrl.pathname === "/api/ingestion/revalidate"
    && request.method === "POST";
  const result = machineRequest ? "allowed" : await checkLogin(request.headers.get("authorization"));
  const response = result === "allowed" ? NextResponse.next() : new NextResponse(
    result === "unconfigured" ? "Private access is not configured." : "Sign in to Sportsball.",
    { status: result === "unconfigured" ? 503 : 401 },
  );
  if (result === "denied") response.headers.set("WWW-Authenticate", 'Basic realm="Sportsball", charset="UTF-8"');
  // Authenticated pages must never enter shared browser/CDN response caches.
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("CDN-Cache-Control", "no-store");
  response.headers.set("Vercel-CDN-Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

// Protect pages, APIs, React Server Component requests, and static paths alike.
export const config = { matcher: "/:path*" };
