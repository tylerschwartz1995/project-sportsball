import { withReadContext } from "@/data/read-context";
import { parseSeasonId } from "@/contracts/season";
import {
  gameTypeForPhase,
  parseSeasonPhase
} from "@/contracts/season-phase";
import { listCachedSeasons } from "@/data/page-cache";
import { firstQueryValue } from "@/lib/directory";
import "server-only";
import { loadLeaderboard } from "./queries";
import { AnalyticsPageProps, parseLeaderboardType, parseMinimumMinutes, parseSituation } from './logic';
async function loadAnalyticsPageData({
  searchParams,
}: AnalyticsPageProps) {
  const params = await searchParams;
  const chartParams = {};
  const seasons = await listCachedSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const type = parseLeaderboardType(firstQueryValue(params.type));
  const requestedPhase = parseSeasonPhase(firstQueryValue(params.phase));
  const phase = type === "teams" ? requestedPhase : "regular";
  const defaultSituation = type === "goalies" ? "all" : "5on5";
  const situation = parseSituation(
    firstQueryValue(params.situation),
    defaultSituation,
  );
  const defaultMinimum = type === "teams" ? 0 : type === "goalies" ? 500 : 300;
  const minimumMinutes = parseMinimumMinutes(
    firstQueryValue(params.minimum),
    defaultMinimum,
  );
  const hasCoverage = Boolean(selectedSeason && selectedSeason.id >= 20082009);
  const gameType = gameTypeForPhase(phase);
  const rows = selectedSeason && hasCoverage ? await loadLeaderboard(type, selectedSeason.id, situation, minimumMinutes * 60, gameType) : [];
  return {
    selectedSeason,
    type,
    phase,
    seasons,
    minimumMinutes,
    chartParams,
    hasCoverage,
    situation,
    rows,
  } as const;
}

export function loadAnalyticsPage(...args: Parameters<typeof loadAnalyticsPageData>) {
  return withReadContext("analytics/directory", () => loadAnalyticsPageData(...args));
}
