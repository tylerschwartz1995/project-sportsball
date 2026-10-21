import { withReadContext } from "@/data/read-context";
import { parseSeasonId } from "@/contracts/season";
import {
  getCachedStandings,
  listCachedSeasons,
} from "@/data/page-cache";
import {
  firstQueryValue,
  parseSortDirection
} from "@/lib/directory";
import "server-only";
import { StandingsPageProps, buildGroups, parseView, standingsColumns } from './logic';
async function loadStandingsPageData({
  searchParams,
}: StandingsPageProps) {
  const params = await searchParams;
  const seasons = await listCachedSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const requestedSort = firstQueryValue(params.sort);
  const activeSort = standingsColumns.some(
    (column) => column.key === requestedSort,
  )
    ? requestedSort!
    : "points";
  const direction = parseSortDirection(
    firstQueryValue(params.dir),
    activeSort === "rank" || activeSort === "team" ? "asc" : "desc",
  );
  const view = parseView(firstQueryValue(params.view));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const standings = selectedSeason ? await getCachedStandings(selectedSeason.id) : [];
  const leader = standings[0];
  const groups = buildGroups(standings, view);
  const requestedGroup = firstQueryValue(params.group);
  const selectedGroup = groups.find(group => group.label === requestedGroup) ?? groups[0];
  return {
    selectedSeason,
    seasons,
    leader,
    view,
    activeSort,
    direction,
    groups,
    selectedGroup,
    standings,
  } as const;
}

export function loadStandingsPage(...args: Parameters<typeof loadStandingsPageData>) {
  return withReadContext("standings/directory", () => loadStandingsPageData(...args));
}
