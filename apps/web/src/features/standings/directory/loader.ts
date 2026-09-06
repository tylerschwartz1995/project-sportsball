import { parseSeasonId } from "@/contracts/season";
import {
  getCachedStandings,
  getCachedStandingsPointsHistory,
  listCachedSeasons,
} from "@/data/page-cache";
import {
  firstQueryValue,
  parseSortDirection
} from "@/lib/directory";
import "server-only";
import { StandingsPageProps, buildGroups, parseStandingsDisplay, parseView, standingsColumns } from './logic';
export async function loadStandingsPage({
  searchParams,
}: StandingsPageProps) {
  const params = await searchParams;
  const chartDivision = firstQueryValue(params.chartDivision);
  const seasons = await listCachedSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const requestedSort = firstQueryValue(params.sort);
  const activeSort = standingsColumns.some(
    (column) => column.key === requestedSort,
  )
    ? requestedSort!
    : "rank";
  const direction = parseSortDirection(
    firstQueryValue(params.dir),
    activeSort === "rank" || activeSort === "team" ? "asc" : "desc",
  );
  const view = parseView(firstQueryValue(params.view));
  const display = parseStandingsDisplay(firstQueryValue(params.display));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const [standings, pointsHistory] = selectedSeason
    ? await Promise.all([
      getCachedStandings(selectedSeason.id),
      display === "progress"
        ? getCachedStandingsPointsHistory(selectedSeason.id)
        : Promise.resolve([]),
    ])
    : [[], []];
  const leader = standings[0];
  const groups = buildGroups(standings, view);
  return {
    selectedSeason,
    seasons,
    leader,
    display,
    chartDivision,
    view,
    activeSort,
    direction,
    groups,
    pointsHistory,
    standings,
  } as const;
}
