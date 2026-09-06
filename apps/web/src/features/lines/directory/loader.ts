import { withReadContext } from "@/data/read-context";
import { parseSeasonId } from "@/contracts/season";
import { listCachedSeasons, listCachedTeamsBySeason } from "@/data/page-cache";
import { listMoneyPuckSeasonUnits } from "@/data/performance-cache";
import { paginate, parsePage, parsePageSize, parseSortDirection } from "@/lib/directory";
import "server-only";
import { DEFAULT_MINIMUM_MINUTES, firstValue, ICE_TIME_OPTIONS, LinesPageProps, sortUnits, UNIT_SORTS, UNIT_VIEWS, WINDOW_OPTIONS } from './logic';
async function loadLinesPageData({ searchParams }: LinesPageProps) {
  const params = await searchParams;
  const seasons = await listCachedSeasons();
  const parsedSeason = parseSeasonId(firstValue(params.season));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const requestedMinimum = Number(firstValue(params.minimum));
  const minimumMinutes = ICE_TIME_OPTIONS.includes(
    requestedMinimum as (typeof ICE_TIME_OPTIONS)[number],
  )
    ? requestedMinimum
    : DEFAULT_MINIMUM_MINUTES;
  const requestedTeam = Number(firstValue(params.team));
  const requestedTeamId =
    Number.isSafeInteger(requestedTeam) && requestedTeam > 0
      ? requestedTeam
      : undefined;
  const requestedWindow = Number(firstValue(params.window));
  const rollingGames = WINDOW_OPTIONS.includes(
    requestedWindow as (typeof WINDOW_OPTIONS)[number],
  )
    ? (requestedWindow as (typeof WINDOW_OPTIONS)[number])
    : undefined;
  const requestedView = firstValue(params.view);
  const view = UNIT_VIEWS.includes(requestedView as (typeof UNIT_VIEWS)[number])
    ? (requestedView as (typeof UNIT_VIEWS)[number])
    : "lines";
  const requestedSort = firstValue(params.sort);
  const sort = UNIT_SORTS.includes(requestedSort as (typeof UNIT_SORTS)[number])
    ? (requestedSort as (typeof UNIT_SORTS)[number])
    : "xgPercentage";
  const direction = parseSortDirection(firstValue(params.direction), "desc");
  const pageSize = parsePageSize(firstValue(params.perPage));
  const [teams, units] = selectedSeason
    ? await Promise.all([
      listCachedTeamsBySeason(selectedSeason.id),
      listMoneyPuckSeasonUnits(selectedSeason.id, view === "lines" ? "line" : "pairing", {
        minimumIceTimeSeconds: minimumMinutes * 60,
        teamNhlId: requestedTeamId,
        rollingGames,
        limit: 100,
      }),
    ])
    : [[], []];
  const selectedTeam = teams.find(
    ({ team }) => team.nhlTeamId === requestedTeamId,
  )?.team;
  const selectedRows = units;
  const sortedRows = sortUnits(selectedRows, sort, direction);
  const unitPage = paginate(sortedRows, parsePage(firstValue(params.page)), pageSize);
  const navigationParams = {
    season: selectedSeason?.id,
    minimum: minimumMinutes,
    team: selectedTeam?.nhlTeamId,
    window: rollingGames,
    view,
    sort,
    direction,
  };
  return {
    selectedSeason,
    seasons,
    minimumMinutes,
    selectedTeam,
    rollingGames,
    pageSize,
    view,
    sort,
    direction,
    navigationParams,
    unitPage,
    teams,
    units,
  } as const;
}

export function loadLinesPage(...args: Parameters<typeof loadLinesPageData>) {
  return withReadContext("lines/directory", () => loadLinesPageData(...args));
}
