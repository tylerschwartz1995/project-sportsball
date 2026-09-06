import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

export const runtime = "nodejs";

/** The ingestion runner can expire statistics, but cannot write website data. */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.SPORTSBALL_REVALIDATION_TOKEN;
  const supplied = request.headers.get("authorization") ?? "";
  if (!secret) {
    return Response.json({ error: "Revalidation is not configured." }, { status: 503 });
  }
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(supplied);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  revalidateTag("ingestion", { expire: 0 });
  return Response.json({ revalidated: true }, { headers: { "Cache-Control": "no-store" } });
}
