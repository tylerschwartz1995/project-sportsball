import { NextRequest, NextResponse } from "next/server";
import { allowedUser, privateAccessRequired } from "@/auth/access";
import { privateResponse, requestAuth } from "@/auth/server";

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const fail = (status: number, message: string) => privateResponse(NextResponse.json({ message }, { status }));
  if (!privateAccessRequired()) return fail(503, "Sign-in is not enabled.");
  try {
    const response = privateResponse(NextResponse.json({ ok: true }));
    const { auth, config } = requestAuth(request, response);
    // Never trust a forwarded Host header as the expected origin; no cross-site login/logout.
    if (request.headers.get("origin") !== config.origin) return fail(403, "Request not allowed.");
    const { action } = await context.params;
    if (action === "sign-out") {
      const result = await auth.signOut();
      if (result.error) return fail(503, "Sign-out failed. Please retry.");
      return response;
    }
    if (!["send-code", "verify-code"].includes(action)) return fail(404, "Not found.");
    if (!request.headers.get("content-type")?.startsWith("application/json")) return fail(415, "JSON required.");
    const raw = await request.text();
    if (raw.length > 2048) return fail(413, "Request too large.");
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw); } catch { return fail(400, "Invalid request."); }
    if (!body || typeof body.email !== "string") return fail(400, "Enter your email address.");
    const email = body.email.trim().toLowerCase();
    if (!config.emails.includes(email)) return action === "send-code" ? response : fail(401, "Unable to sign in with that code.");
    if (action === "send-code") {
      const result = await auth.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
      if (result.error) return fail(result.error.status === 429 ? 429 : 503, "Unable to send a code. Please try again later.");
      return response;
    }
    if (typeof body.otp !== "string" || !/^\d{6}$/.test(body.otp)) return fail(400, "Enter the six-digit code.");
    const result = await auth.signIn.emailOtp({ email, otp: body.otp });
    if (result.error || (!allowedUser(result.data?.user, config.emails) || result.data?.user.email.toLowerCase() !== email)) return fail(401, "Unable to sign in with that code.");
    return response;
  } catch { return fail(503, "Sign-in is temporarily unavailable."); }
}
