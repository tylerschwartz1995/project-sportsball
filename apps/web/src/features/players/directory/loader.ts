import type {
  GoalieSeasonSummary,
  SkaterSeasonSummary
} from "@/contracts/player";
import { parseSeasonId } from "@/contracts/season";
import {
  gameTypeForPhase,
  parseSeasonPhase
} from "@/contracts/season-phase";
import { listCachedSeasons } from "@/data/page-cache";
import {
  listGoalieDirectoryPage,
  listSkaterDirectoryPage
} from "@/data/players";
import {
  firstQueryValue,
  normalizeSearch,
  parsePage,
  parseSortDirection,
} from "@/lib/directory";
import {
  parsePlayerPositionFilter
} from "@/lib/player-position";
import {
  goalieSortOptions,
  skaterSortOptions,
} from "@/lib/player-sort-options";
import "server-only";
import { emptyDirectoryPage, parseMinimum, PlayersPageProps } from './logic';
export async function loadPlayersPage({ searchParams }: PlayersPageProps) {
  const params = await searchParams;
  const seasons = await listCachedSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const phase = parseSeasonPhase(firstQueryValue(params.phase));
  const query = normalizeSearch(firstQueryValue(params.q));
  const category =
    firstQueryValue(params.type) === "goalies" ? "goalies" : "skaters";
  const sortOptions =
    category === "goalies" ? goalieSortOptions : skaterSortOptions;
  const requestedSort = firstQueryValue(params.sort);
  const sort = sortOptions.some((option) => option.value === requestedSort)
    ? requestedSort!
    : category === "goalies"
      ? "savePercentage"
      : "points";
  const direction = parseSortDirection(
    firstQueryValue(params.dir),
    sort === "name" ? "asc" : "desc",
  );
  const requestedPage = parsePage(firstQueryValue(params.page));
  const position =
    category === "skaters"
      ? parsePlayerPositionFilter(firstQueryValue(params.position))
      : "";
  const filters = {
    minGames: firstQueryValue(params.minGames) ?? "0",
    minGoals:
      category === "skaters" ? (firstQueryValue(params.minGoals) ?? "0") : "0",
    minAssists:
      category === "skaters"
        ? (firstQueryValue(params.minAssists) ?? "0")
        : "0",
    minPoints:
      category === "skaters" ? (firstQueryValue(params.minPoints) ?? "0") : "0",
    minWins:
      category === "goalies" ? (firstQueryValue(params.minWins) ?? "0") : "0",
    minSavePercentage:
      category === "goalies"
        ? (firstQueryValue(params.minSavePercentage) ?? "0")
        : "0",
    country: firstQueryValue(params.country) ?? "",
    region: firstQueryValue(params.region) ?? "",
    city: firstQueryValue(params.city) ?? "",
  };
  const minGames = parseMinimum(filters.minGames);
  const minGoals = parseMinimum(filters.minGoals);
  const minAssists = parseMinimum(filters.minAssists);
  const minPoints = parseMinimum(filters.minPoints);
  const minWins = parseMinimum(filters.minWins);
  const minSavePercentage = parseMinimum(filters.minSavePercentage);
  let skaterPage = emptyDirectoryPage<SkaterSeasonSummary>();
  let goaliePage = emptyDirectoryPage<GoalieSeasonSummary>();
  if (selectedSeason && category === "skaters") {
    skaterPage = await listSkaterDirectoryPage({
      seasonId: selectedSeason.id,
      gameType: gameTypeForPhase(phase),
      query,
      position,
      sort,
      direction,
      requestedPage,
      minGames,
      minGoals,
      minAssists,
      minPoints,
      country: filters.country,
      region: filters.region,
      city: filters.city,
    });
  } else if (selectedSeason) {
    goaliePage = await listGoalieDirectoryPage({
      seasonId: selectedSeason.id,
      gameType: gameTypeForPhase(phase),
      query,
      sort,
      direction,
      requestedPage,
      minGames,
      minWins,
      minSavePercentage,
      country: filters.country,
      region: filters.region,
      city: filters.city,
    });
  }
  const locations =
    category === "skaters" ? skaterPage.locations : goaliePage.locations;
  const contextParams = {
    phase,
    type: category,
    q: query,
    position,
    sort,
    dir: direction,
    ...filters,
  };
  return {
    selectedSeason,
    phase,
    seasons,
    contextParams,
    category,
    query,
    position,
    sort,
    direction,
    locations,
    filters,
    skaterPage,
    goaliePage,
    minGames,
  } as const;
}
