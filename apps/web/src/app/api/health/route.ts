import { getServiceHealth } from "@/data/health";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await getServiceHealth();
    return Response.json(health, {
      status: health.status === "error" ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      {
        service: "sportsball-web",
        status: "error",
        database: "error",
        message: "Database health check failed.",
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
