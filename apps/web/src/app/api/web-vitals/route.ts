import { isPerformanceRouteContextValue } from "@/lib/performance-route-context";

const METRIC_NAMES = new Set(["TTFB", "FCP", "LCP", "FID", "CLS", "INP", "NAV_CONTENT"]);
const RATINGS = new Set(["good", "needs-improvement", "poor"]);
const MAX_BODY_BYTES = 2_048;

type WebVitalPayload = {
  id: string;
  name: string;
  value: number;
  rating?: string;
  navigationType?: string;
  path: string;
  routeView?: string;
  routeSubView?: string;
  routePhase?: string;
};

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(null, { status: 413 });
  }

  let payload: unknown;
  try {
    // Content-Length is optional and untrusted; bound the actual stream too.
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: "Invalid JSON." }, { status: 400 });
    const decoder = new TextDecoder();
    let body = "";
    let bytes = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > MAX_BODY_BYTES) {
          void reader.cancel().catch(() => undefined);
          return new Response(null, { status: 413 });
        }
        body += decoder.decode(chunk.value, { stream: true });
      }
      body += decoder.decode();
    } finally {
      reader.releaseLock();
    }
    payload = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!isWebVitalPayload(payload)) {
    return Response.json({ error: "Invalid metric." }, { status: 400 });
  }

  console.info(
    JSON.stringify({
      event: "web-vital",
      id: payload.id,
      name: payload.name,
      value: payload.value,
      rating: payload.rating,
      navigationType: payload.navigationType,
      path: payload.path,
      routeView: payload.routeView,
      routeSubView: payload.routeSubView,
      routePhase: payload.routePhase,
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
    !metric.path.includes("?") &&
    !metric.path.includes("#") &&
    isPerformanceRouteContextValue(metric.routeView) &&
    isPerformanceRouteContextValue(metric.routeSubView) &&
    isPerformanceRouteContextValue(metric.routePhase)
  );
}
