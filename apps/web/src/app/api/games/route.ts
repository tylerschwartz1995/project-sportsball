import { parseGameDate } from "@/contracts/game";
import { parseSeasonId } from "@/contracts/season";
import { getGamesByDate } from "@/data/games";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const seasonId = parseSeasonId(searchParams.get("season"));
  const gameDate = parseGameDate(searchParams.get("date"));

  if (seasonId === null) {
    return Response.json(
      { error: "season must use the NHL format YYYYYYYY, such as 20242025" },
      { status: 400 },
    );
  }
  if (gameDate === null) {
    return Response.json(
      { error: "date must be a real calendar date in YYYY-MM-DD format" },
      { status: 400 },
    );
  }

  try {
    const games = await getGamesByDate(seasonId, gameDate);
    if (games.length === 0) {
      return Response.json(
        { error: `No games are available on ${gameDate} in season ${seasonId}` },
        { status: 404 },
      );
    }
    return Response.json(
      { data: games },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    console.error(`Failed to load games for ${seasonId} on ${gameDate}`, error);
    return Response.json(
      { error: "Games are temporarily unavailable" },
      { status: 503 },
    );
  }
}
