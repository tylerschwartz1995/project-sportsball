const METRIC_NAMES = new Set(["TTFB", "FCP", "LCP", "FID", "CLS", "INP"]);
const RATINGS = new Set(["good", "needs-improvement", "poor"]);

type WebVitalPayload = {
  id: string;
  name: string;
  value: number;
  rating?: string;
  navigationType?: string;
  path: string;
};

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 2_048) {
    return new Response(null, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!isWebVitalPayload(payload)) {
    return Response.json({ error: "Invalid metric." }, { status: 400 });
  }

  console.info(
    JSON.stringify({
      event: "web-vital",
      ...payload,
      recordedAt: new Date().toISOString(),
    }),
  );
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}

function isWebVitalPayload(value: unknown): value is WebVitalPayload {
  if (!value || typeof value !== "object") return false;
  const metric = value as Record<string, unknown>;
  return (
    typeof metric.id === "string" &&
    metric.id.length > 0 &&
    metric.id.length <= 100 &&
    typeof metric.name === "string" &&
    METRIC_NAMES.has(metric.name) &&
    typeof metric.value === "number" &&
    Number.isFinite(metric.value) &&
    metric.value >= 0 &&
    (metric.rating === undefined ||
      (typeof metric.rating === "string" && RATINGS.has(metric.rating))) &&
    (metric.navigationType === undefined ||
      (typeof metric.navigationType === "string" &&
        metric.navigationType.length <= 40)) &&
    typeof metric.path === "string" &&
    metric.path.startsWith("/") &&
    metric.path.length <= 500 &&
    !metric.path.includes("?")
  );
}
