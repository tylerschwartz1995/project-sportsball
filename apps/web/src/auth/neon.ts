import "server-only";
import { createAuthServer, extractNeonAuthCookies } from "@neondatabase/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { authConfiguration } from "./access";

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

