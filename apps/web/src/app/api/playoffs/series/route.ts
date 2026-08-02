import { parseSeasonId } from "@/contracts/season";
import { getPlayoffSeriesPlayerStats } from "@/data/playoffs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const seasonId = parseSeasonId(searchParams.get("season"));
  const round = parseBoundedInteger(searchParams.get("round"), 1, 4);
  const matchup = parseBoundedInteger(searchParams.get("matchup"), 1, 8);

  if (seasonId === null || round === null || matchup === null) {
    return Response.json(
      { error: "A valid season, playoff round, and matchup are required" },
      { status: 400 },
    );
  }

  try {
    const data = await getPlayoffSeriesPlayerStats(
      seasonId,
      round,
      matchup,
    );
    return Response.json(
      { data },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    console.error(
      `Failed to load playoff series ${seasonId}/${round}/${matchup}`,
      error,
    );
    return Response.json(
      { error: "Series player statistics are temporarily unavailable" },
      { status: 503 },
    );
  }
}

function parseBoundedInteger(
  value: string | null,
  minimum: number,
  maximum: number,
): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}
