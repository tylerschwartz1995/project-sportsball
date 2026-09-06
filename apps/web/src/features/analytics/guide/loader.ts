import { withReadContext } from "@/data/read-context";
import { parseSeasonId } from "@/contracts/season";
import { listCachedSeasons } from "@/data/page-cache";
import { firstQueryValue } from "@/lib/directory";
import { MetricGuidePageProps } from './logic';

import "server-only";
async function loadMetricGuidePageData({
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

export function loadMetricGuidePage(...args: Parameters<typeof loadMetricGuidePageData>) {
  return withReadContext("analytics/guide", () => loadMetricGuidePageData(...args));
}
