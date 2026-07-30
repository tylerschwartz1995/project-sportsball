import { parseNhlId } from "@/contracts/entity";
import { getPlayerDetail } from "@/data/players";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const nhlPlayerId = parseNhlId((await params).id);
  if (nhlPlayerId === null) {
    return Response.json(
      { error: "a positive NHL player id is required" },
      { status: 400 },
    );
  }

  try {
    const player = await getPlayerDetail(nhlPlayerId);
    if (!player) {
      return Response.json(
        { error: `Player ${nhlPlayerId} was not found` },
        { status: 404 },
      );
    }
    return Response.json(
      { data: player },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    console.error(`Failed to load player ${nhlPlayerId}`, error);
    return Response.json(
      { error: "Player details are temporarily unavailable" },
      { status: 503 },
    );
  }
}
