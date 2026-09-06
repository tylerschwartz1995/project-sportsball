import { withReadContext } from "@/data/read-context";
import { parseNhlId } from "@/contracts/entity";
import { parseSeasonId } from "@/contracts/season";
import {
  gameTypeForPhase,
  parseSeasonPhase
} from "@/contracts/season-phase";

import { listCachedSeasons, getCachedTeamGameLog, listCachedTeamSeasonIds } from "@/data/page-cache";

import { paginate, parsePage, parsePageSize, parseSortDirection } from "@/lib/directory";
import { notFound } from "next/navigation";
import "server-only";
import { TeamGamesPageProps, firstValue, parseTeamGameSort, sortTeamGames } from './logic';
async function loadTeamGamesPageData({
  params,
  searchParams,
}: TeamGamesPageProps) {
  const nhlTeamId = parseNhlId((await params).id);
  if (nhlTeamId === null) {
    notFound();
  }
  const [seasons, teamSeasonIds] = await Promise.all([
    listCachedSeasons(),
    listCachedTeamSeasonIds(nhlTeamId),
  ]);
  const availableSeasonIds = new Set(teamSeasonIds);
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
  const log = await getCachedTeamGameLog(nhlTeamId, selectedSeason.id);
  if (!log) {
    notFound();
  }
  const games = log.games.filter(
    (game) => game.gameType === gameTypeForPhase(phase),
  );
  const recentGames = games.slice(0, 10);
  const sort = parseTeamGameSort(firstValue(pageParams.sort));
  const direction = parseSortDirection(firstValue(pageParams.direction), "desc");
  const pageSize = parsePageSize(firstValue(pageParams.perPage));
  const gamePage = paginate(
    sortTeamGames(games, sort, direction),
    parsePage(firstValue(pageParams.page)),
    pageSize,
  );
  const navigationParams = {
    season: selectedSeason.id,
    phase,
    sort,
    direction,
  };
  return {
    log,
    selectedSeason,
    phase,
    availableSeasons,
    pageSize,
    recentGames,
    gamePage,
    sort,
    direction,
    navigationParams,
  } as const;
}

export function loadTeamGamesPage(...args: Parameters<typeof loadTeamGamesPageData>) {
  return withReadContext("teams/game-log", () => loadTeamGamesPageData(...args));
}
