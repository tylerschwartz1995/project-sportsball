import { parseNhlId } from "@/contracts/entity";
import { getGameBoxScore } from "@/data/games";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const nhlGameId = parseNhlId((await params).id);
  if (nhlGameId === null) {
    return Response.json(
      { error: "a positive NHL game id is required" },
      { status: 400 },
    );
  }

  try {
    const game = await getGameBoxScore(nhlGameId);
    if (!game) {
      return Response.json(
        { error: `Game ${nhlGameId} was not found` },
        { status: 404 },
      );
    }
    return Response.json(
      { data: game },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    console.error(`Failed to load game ${nhlGameId}`, error);
    return Response.json(
      { error: "Game details are temporarily unavailable" },
      { status: 503 },
    );
  }
}
