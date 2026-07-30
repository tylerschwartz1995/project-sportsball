import { listSeasons } from "@/data/seasons";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const seasons = await listSeasons();
    return Response.json(
      { data: seasons },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    console.error("Failed to load seasons", error);
    return Response.json(
      { error: "Season data is temporarily unavailable" },
      { status: 503 },
    );
  }
}
