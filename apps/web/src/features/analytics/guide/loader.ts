import { parseSeasonId } from "@/contracts/season";
import { listCachedSeasons } from "@/data/page-cache";
import { firstQueryValue } from "@/lib/directory";
import { MetricGuidePageProps } from './logic';

import "server-only";
export async function loadMetricGuidePage({
  searchParams,
}: MetricGuidePageProps) {
  const seasons = await listCachedSeasons();
  const parsedSeason = parseSeasonId(
    firstQueryValue((await searchParams).season),
  );
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  return {
    selectedSeason,
  } as const;
}
