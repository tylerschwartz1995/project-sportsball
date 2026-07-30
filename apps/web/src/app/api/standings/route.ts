import { parseSeasonId } from "@/contracts/season";
import { getStandings } from "@/data/standings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const seasonId = parseSeasonId(new URL(request.url).searchParams.get("season"));
  if (seasonId === null) {
    return Response.json(
      { error: "season must use the NHL format YYYYYYYY, such as 20242025" },
      { status: 400 },
    );
  }

  try {
    const standings = await getStandings(seasonId);
    if (standings.length === 0) {
      return Response.json(
        { error: `No standings are available for season ${seasonId}` },
        { status: 404 },
      );
    }
    return Response.json(
      { data: standings },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    console.error(`Failed to load standings for ${seasonId}`, error);
    return Response.json(
      { error: "Standings are temporarily unavailable" },
      { status: 503 },
    );
  }
}
