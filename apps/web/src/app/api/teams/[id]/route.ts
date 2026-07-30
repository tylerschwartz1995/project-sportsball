import { parseNhlId } from "@/contracts/entity";
import { parseSeasonId } from "@/contracts/season";
import { getTeamSeasonDetail } from "@/data/teams";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const nhlTeamId = parseNhlId((await params).id);
  const seasonId = parseSeasonId(
    new URL(request.url).searchParams.get("season"),
  );
  if (nhlTeamId === null || seasonId === null) {
    return Response.json(
      { error: "a positive NHL team id and valid NHL season are required" },
      { status: 400 },
    );
  }

  try {
    const team = await getTeamSeasonDetail(nhlTeamId, seasonId);
    if (!team) {
      return Response.json(
        { error: `Team ${nhlTeamId} has no data in season ${seasonId}` },
        { status: 404 },
      );
    }
    return Response.json(
      { data: team },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    console.error(`Failed to load team ${nhlTeamId} in ${seasonId}`, error);
    return Response.json(
      { error: "Team details are temporarily unavailable" },
      { status: 503 },
    );
  }
}
