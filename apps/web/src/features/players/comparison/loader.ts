import type {
  GoalieSeasonSummary,
  SkaterSeasonSummary,
} from "@/contracts/player";
import { parseSeasonId } from "@/contracts/season";
import {
  gameTypeForPhase,
  parseSeasonPhase
} from "@/contracts/season-phase";
import { getMoneyPuckPlayerSeason } from "@/data/advanced";
import { listCachedSeasons } from "@/data/page-cache";
import { listPlayersBySeason } from "@/data/players";
import { firstQueryValue } from "@/lib/directory";
import "server-only";
import { GOALIE_METRICS, PlayerCategory, PlayerComparePageProps, SKATER_METRICS, buildGoalieEntry, buildSkaterEntry, parsePlayerIds } from './logic';
export async function loadPlayerComparePage({
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
  const index = selectedSeason
    ? await listPlayersBySeason(selectedSeason.id, gameTypeForPhase(phase))
    : { seasonId: 0, skaters: [], goalies: [] };
  const availablePlayers =
    category === "skaters" ? index.skaters : index.goalies;
  const requestedIds = parsePlayerIds(firstQueryValue(params.players));
  const availableIds = new Set(
    availablePlayers.map((player) => player.nhlPlayerId),
  );
  const selectedIds = requestedIds.filter((id) => availableIds.has(id));
  const selectedRows = selectedIds
    .map((id) => availablePlayers.find((player) => player.nhlPlayerId === id))
    .filter(
      (player): player is SkaterSeasonSummary | GoalieSeasonSummary =>
        player !== undefined,
    );
  const advanced =
    selectedSeason && phase === "regular"
      ? await Promise.all(
        selectedRows.map((player) =>
          getMoneyPuckPlayerSeason(player.nhlPlayerId, selectedSeason.id),
        ),
      )
      : [];
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
