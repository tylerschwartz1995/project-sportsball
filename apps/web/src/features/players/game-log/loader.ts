import { withReadContext } from "@/data/read-context";
import { parseNhlId } from "@/contracts/entity";
import { parseSeasonId } from "@/contracts/season";
import {
  gameTypeForPhase,
  parseSeasonPhase
} from "@/contracts/season-phase";
import { getPlayerGameLog, listPlayerGameSeasonIds } from "@/data/performance-cache";
import { listCachedSeasons } from "@/data/page-cache";
import { paginate, parsePage, parsePageSize, parseSortDirection } from "@/lib/directory";
import { notFound } from "next/navigation";
import "server-only";
import { firstValue, parseGoalieSort, parseSkaterSort, PlayerGamesPageProps, sortGoalieGames, sortSkaterGames } from './logic';
async function loadPlayerGamesPageData({
  params,
  searchParams,
}: PlayerGamesPageProps) {
  const nhlPlayerId = parseNhlId((await params).id);
  if (nhlPlayerId === null) {
    notFound();
  }
  const [seasons, playerSeasonIds] = await Promise.all([
    listCachedSeasons(),
    listPlayerGameSeasonIds(nhlPlayerId),
  ]);
  const availableSeasonIds = new Set(playerSeasonIds);
  const availableSeasons = seasons.filter((season) =>
    availableSeasonIds.has(season.id),
  );
  const pageParams = await searchParams;
  const requestedSeason = parseSeasonId(firstValue(pageParams.season));
  const phase = parseSeasonPhase(firstValue(pageParams.phase));
  const selectedSeason =
    availableSeasons.find((season) => season.id === requestedSeason) ??
    availableSeasons[0];
  if (!selectedSeason) {
    notFound();
  }
  const log = await getPlayerGameLog(nhlPlayerId, selectedSeason.id);
  if (!log) {
    notFound();
  }
  const isGoalie =
    log.profile.position === "G" ||
    (log.goalieGames.length > 0 && log.skaterGames.length === 0);
  const gameType = gameTypeForPhase(phase);
  const skaterGames = log.skaterGames.filter(
    (game) => game.gameType === gameType,
  );
  const goalieGames = log.goalieGames.filter(
    (game) => game.gameType === gameType,
  );
  const pageSize = parsePageSize(firstValue(pageParams.perPage));
  const direction = parseSortDirection(firstValue(pageParams.direction), "desc");
  const requestedPage = parsePage(firstValue(pageParams.page));
  const skaterSort = parseSkaterSort(firstValue(pageParams.sort));
  const goalieSort = parseGoalieSort(firstValue(pageParams.sort));
  const skaterPage = paginate(sortSkaterGames(skaterGames, skaterSort, direction), requestedPage, pageSize);
  const goaliePage = paginate(sortGoalieGames(goalieGames, goalieSort, direction), requestedPage, pageSize);
  return {
    log,
    selectedSeason,
    phase,
    availableSeasons,
    pageSize,
    isGoalie,
    goalieGames,
    skaterGames,
    skaterPage,
    skaterSort,
    direction,
    goaliePage,
    goalieSort,
  } as const;
}

export function loadPlayerGamesPage(...args: Parameters<typeof loadPlayerGamesPageData>) {
  return withReadContext("players/game-log", () => loadPlayerGamesPageData(...args));
}
