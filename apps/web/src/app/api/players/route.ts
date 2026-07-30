import { parseSeasonId } from "@/contracts/season";
import { listPlayersBySeason } from "@/data/players";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const seasonId = parseSeasonId(
    new URL(request.url).searchParams.get("season"),
  );
  if (seasonId === null) {
    return Response.json(
      { error: "season must use the NHL format YYYYYYYY, such as 20242025" },
      { status: 400 },
    );
  }

  try {
    const players = await listPlayersBySeason(seasonId);
    if (players.skaters.length === 0 && players.goalies.length === 0) {
      return Response.json(
        { error: `No players are available for season ${seasonId}` },
        { status: 404 },
      );
    }
    return Response.json(
      { data: players },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    console.error(`Failed to load players for ${seasonId}`, error);
    return Response.json(
      { error: "Players are temporarily unavailable" },
      { status: 503 },
    );
  }
}
