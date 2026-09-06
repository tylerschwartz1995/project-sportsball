import { withReadContext } from "@/data/read-context";
import type {
  GoalieSeasonSummary,
  SkaterSeasonSummary,
} from "@/contracts/player";
import { parseSeasonId } from "@/contracts/season";
import {
  gameTypeForPhase,
  parseSeasonPhase
} from "@/contracts/season-phase";
import { getMoneyPuckPlayerSeasons } from "@/data/performance-cache";
import { listCachedSeasons } from "@/data/page-cache";
import { listPlayerComparisonOptions, getPlayerComparisonRows } from "@/data/performance-cache";
import { firstQueryValue } from "@/lib/directory";
import "server-only";
import { GOALIE_METRICS, PlayerCategory, PlayerComparePageProps, SKATER_METRICS, buildGoalieEntry, buildSkaterEntry, parsePlayerIds } from './logic';
async function loadPlayerComparePageData({
  searchParams,
}: PlayerComparePageProps) {
  const params = await searchParams;
  const seasons = await listCachedSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const phase = parseSeasonPhase(firstQueryValue(params.phase));
  const category: PlayerCategory =
    firstQueryValue(params.type) === "goalies" ? "goalies" : "skaters";
  const availablePlayers = selectedSeason
    ? await listPlayerComparisonOptions(selectedSeason.id, gameTypeForPhase(phase), category)
    : [];
  const requestedIds = parsePlayerIds(firstQueryValue(params.players));
  const availableIds = new Set(
    availablePlayers.map((player) => player.nhlPlayerId),
  );
  const selectedIds = requestedIds.filter((id) => availableIds.has(id));
  const ids = [...selectedIds].sort((a, b) => a - b);
  const [unsortedRows, advanced] = selectedSeason ? await Promise.all([
    getPlayerComparisonRows(selectedSeason.id, gameTypeForPhase(phase), category, ids),
    phase === "regular" ? getMoneyPuckPlayerSeasons(ids, selectedSeason.id) : Promise.resolve([]),
  ]) : [[], []];
  const selectedRows = selectedIds.flatMap(id => unsortedRows.filter(row => row.nhlPlayerId === id));
  const metrics = category === "skaters" ? SKATER_METRICS : GOALIE_METRICS;
  const comparisonEntries =
    category === "skaters"
      ? (selectedRows as SkaterSeasonSummary[]).map((player) =>
        buildSkaterEntry(
          player,
          advanced.find((data) => data.nhlPlayerId === player.nhlPlayerId),
        ),
      )
      : (selectedRows as GoalieSeasonSummary[]).map((player) =>
        buildGoalieEntry(
          player,
          advanced.find((data) => data.nhlPlayerId === player.nhlPlayerId),
        ),
      );
  return {
    selectedSeason,
    phase,
    category,
    seasons,
    selectedIds,
    availablePlayers,
    comparisonEntries,
    metrics,
  } as const;
}

export function loadPlayerComparePage(...args: Parameters<typeof loadPlayerComparePageData>) {
  return withReadContext("players/comparison", () => loadPlayerComparePageData(...args));
}
