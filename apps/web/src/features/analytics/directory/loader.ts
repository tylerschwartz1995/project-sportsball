import { withReadContext } from "@/data/read-context";
import type {
  AdvancedGoalieLeaderboardRow,
  AdvancedSkaterLeaderboardRow,
  AdvancedTeamLeaderboardRow,
} from "@/contracts/advanced-leaderboard";
import { parseSeasonId } from "@/contracts/season";
import {
  gameTypeForPhase,
  parseSeasonPhase
} from "@/contracts/season-phase";
import { listAdvancedTeamLeaders } from "@/data/performance-cache";
import { listCachedSeasons, listCachedTeamsBySeason } from "@/data/page-cache";
import { firstQueryValue } from "@/lib/directory";
import {
  buildGoalieComparisonPoints,
  buildSkaterComparisonPoints,
} from "@/lib/player-comparison";
import { buildTeamComparisonPoints } from "@/lib/team-comparison";
import "server-only";
import { loadLeaderboard } from "./queries";
import { AnalyticsPageProps, parseLeaderboardType, parseMinimumMinutes, parseSituation, pickQueryParams } from './logic';
async function loadAnalyticsPageData({
  searchParams,
}: AnalyticsPageProps) {
  const params = await searchParams;
  const chartParams = pickQueryParams(params, [
    "display",
    "plotMetric",
    "plotGroup",
    "xMetric",
    "yMetric",
    "teamA",
    "teamB",
    "playerA",
    "playerB",
  ]);
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
  const [rows, comparisonAdvancedRows, comparisonTeamRows] =
    selectedSeason && hasCoverage
      ? await Promise.all([
        loadLeaderboard(
          type,
          selectedSeason.id,
          situation,
          minimumMinutes * 60,
          gameType,
        ),
        type === "teams" && situation !== "5on5"
          ? listAdvancedTeamLeaders(selectedSeason.id, "5on5", gameType)
          : Promise.resolve(null),
        type === "teams"
          ? listCachedTeamsBySeason(selectedSeason.id, gameType)
          : Promise.resolve(null),
      ])
      : [[], null, null];
  const comparisonPoints =
    type === "teams" && comparisonTeamRows
      ? buildTeamComparisonPoints(
        situation === "5on5"
          ? (rows as AdvancedTeamLeaderboardRow[])
          : (comparisonAdvancedRows ?? []),
        comparisonTeamRows,
        phase,
      )
      : [];
  const skaterComparisonPoints =
    type === "skaters"
      ? buildSkaterComparisonPoints(rows as AdvancedSkaterLeaderboardRow[])
      : [];
  const goalieComparisonPoints =
    type === "goalies"
      ? buildGoalieComparisonPoints(rows as AdvancedGoalieLeaderboardRow[])
      : [];
  return {
    selectedSeason,
    type,
    phase,
    seasons,
    minimumMinutes,
    chartParams,
    hasCoverage,
    situation,
    comparisonPoints,
    skaterComparisonPoints,
    goalieComparisonPoints,
    rows,
  } as const;
}

export function loadAnalyticsPage(...args: Parameters<typeof loadAnalyticsPageData>) {
  return withReadContext("analytics/directory", () => loadAnalyticsPageData(...args));
}
