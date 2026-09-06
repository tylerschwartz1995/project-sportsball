import { parseSeasonId } from "@/contracts/season";
import { getMoneyPuckUnitDetail } from "@/data/season-units";
import { firstQueryValue } from "@/lib/directory";
import { notFound } from "next/navigation";
import "server-only";
import { UnitPageProps, parsePositiveInteger, parseUnitRoute } from './logic';
export async function loadUnitPage({
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
