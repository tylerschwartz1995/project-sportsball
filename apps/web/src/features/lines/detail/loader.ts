import { withReadContext } from "@/data/read-context";
import { parseSeasonId } from "@/contracts/season";
import { getMoneyPuckUnitDetail } from "@/data/performance-cache";
import { firstQueryValue } from "@/lib/directory";
import { notFound } from "next/navigation";
import "server-only";
import { UnitPageProps, parsePositiveInteger, parseUnitRoute } from './logic';
async function loadUnitPageData({
  params,
  searchParams,
}: UnitPageProps) {
  const route = parseUnitRoute((await params).unit);
  const query = await searchParams;
  const seasonId = parseSeasonId(firstQueryValue(query.season));
  const teamNhlId = parsePositiveInteger(firstQueryValue(query.team));
  if (!route || seasonId === null || teamNhlId === null) {
    notFound();
  }
  const detail = await getMoneyPuckUnitDetail(
    seasonId,
    teamNhlId,
    route.unitType,
    route.playerNhlIds,
  );
  if (!detail) {
    notFound();
  }
  const title = detail.unitType === "line" ? "Forward Line" : "Defensive Pairing";
  return {
    seasonId,
    teamNhlId,
    detail,
    title,
  } as const;
}

export function loadUnitPage(...args: Parameters<typeof loadUnitPageData>) {
  return withReadContext("lines/detail", () => loadUnitPageData(...args));
}
