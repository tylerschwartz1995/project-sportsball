import { getHistorySupplement } from "@/data/history-supplement";
import { withReadContext } from "@/data/read-context";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const phase = params.get("phase"), view = params.get("view");
  if ((phase !== "regular" && phase !== "playoffs") || (view !== "records" && view !== "skaters" && view !== "goalies")) {
    return Response.json({ error: "Invalid history view." }, { status: 400 });
  }
  try {
    const data = await withReadContext("history/supplement", () => getHistorySupplement(phase === "regular" ? 2 : 3, view));
    return Response.json(data, { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } });
  } catch {
    return Response.json({ error: "History is temporarily unavailable." }, { status: 503 });
  }
}
