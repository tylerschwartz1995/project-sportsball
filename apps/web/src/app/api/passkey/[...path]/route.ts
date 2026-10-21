import { NextRequest, NextResponse } from "next/server";
import { passkeyAuth, passkeysEnabled, passkeyPaths } from "@/auth/passkeys";
import { authConfiguration, privateAccessRequired } from "@/auth/access";
import { privateResponse } from "@/auth/server";
async function handle(request: NextRequest) {
  if (!privateAccessRequired() || !passkeysEnabled()) return new NextResponse(null, { status: 404 });
  const path = request.nextUrl.pathname.slice("/api/passkey".length);
  if (!passkeyPaths.has(path)) return new NextResponse(null, { status: 404 });
  try {
    if (request.method === "POST" && request.headers.get("origin") !== authConfiguration().origin) return new NextResponse(null, { status: 403 });
    const result = await passkeyAuth().handler(request);
    return privateResponse(new NextResponse(result.body, { status: result.status, headers: result.headers }));
  } catch { return privateResponse(NextResponse.json({ message: "Sign-in is temporarily unavailable." }, { status: 503 })); }
}
export { handle as GET, handle as POST };
