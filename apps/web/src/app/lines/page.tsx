import Link from "next/link";

import { AnalyticsSectionTabs } from "@/app/_components/analytics-section-tabs";
import {
  FilterActions,
  FilterHeader,
} from "@/app/_components/filter-primitives";
import { SeasonPicker } from "@/app/_components/season-picker";
import { ResultNavigation } from "@/app/_components/result-navigation";
import { SeasonUnitTables } from "@/app/_components/season-unit-tables";
import { SiteHeader } from "@/app/_components/site-header";
import {
  WorkspacePageHeader,
  WorkspacePanel,
} from "@/app/_components/workspace-primitives";
import { parseSeasonId } from "@/contracts/season";
import { listSeasons } from "@/data/seasons";
import { getMoneyPuckSeasonUnitLeaders } from "@/data/season-units";
import { listTeamsBySeason } from "@/data/teams";
import { paginate, parsePage, parsePageSize, parseSortDirection } from "@/lib/directory";
import type { MoneyPuckSeasonUnitStats } from "@/contracts/season-unit";

export const dynamic = "force-dynamic";

const ICE_TIME_OPTIONS = [0, 20, 50, 100, 200, 300] as const;
const WINDOW_OPTIONS = [10, 20, 40] as const;
const UNIT_VIEWS = ["lines", "pairings"] as const;
const UNIT_SORTS = ["team", "players", "games", "iceTime", "xgPercentage", "corsiPercentage", "xGoalsFor", "xGoalsAgainst", "goalsFor", "goalsAgainst", "shotsFor", "shotsAgainst"] as const;

type LinesPageProps = {
  searchParams: Promise<{
    season?: string | string[];
    minimum?: string | string[];
    team?: string | string[];
    window?: string | string[];
    view?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
    sort?: string | string[];
    direction?: string | string[];
  }>;
};

export default async function LinesPage({ searchParams }: LinesPageProps) {
  const params = await searchParams;
  const seasons = await listSeasons();
  const parsedSeason = parseSeasonId(firstValue(params.season));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const requestedMinimum = Number(firstValue(params.minimum));
  const minimumMinutes = ICE_TIME_OPTIONS.includes(
    requestedMinimum as (typeof ICE_TIME_OPTIONS)[number],
  )
    ? requestedMinimum
    : 100;
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
        listTeamsBySeason(selectedSeason.id),
        getMoneyPuckSeasonUnitLeaders(selectedSeason.id, {
          minimumIceTimeSeconds: minimumMinutes * 60,
          teamNhlId: requestedTeamId,
          rollingGames,
          limit: 100,
        }),
      ])
    : [[], { forwardLines: [], defensivePairings: [] }];
  const selectedTeam = teams.find(
    ({ team }) => team.nhlTeamId === requestedTeamId,
  )?.team;
  const selectedRows = view === "lines" ? units.forwardLines : units.defensivePairings;
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

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="analytics" />

      <section className="py-10">
        <WorkspacePageHeader
          eyebrow="MoneyPuck five-on-five units"
          title={`${selectedSeason?.label ?? "No Season"} Top Combinations`}
          description="Compare the most-used forward lines and defensive pairings. Season totals are calculated from stored game-level records, with percentages recomputed from their combined results."
          action={
            <SeasonPicker
              seasons={seasons}
              selectedSeasonId={selectedSeason?.id}
              params={{
                minimum: minimumMinutes,
                team: selectedTeam?.nhlTeamId,
                window: rollingGames,
                view,
                perPage: pageSize,
                sort,
                direction,
              }}
            />
          }
        />

        {selectedSeason ? (
          <AnalyticsSectionTabs seasonId={selectedSeason.id} active="lines" />
        ) : null}

        {selectedSeason && selectedSeason.id >= 20082009 ? (
          <>
            <WorkspacePanel
              className="mt-8"
              title="Combination Scope"
              description="Compare full-season results or each team's most recent 10, 20, or 40 regular-season games. Rolling windows use the last team games in the selected season, then recompute every rate from the supporting totals."
            >
              <CombinationFilters
                seasonId={selectedSeason.id}
                selectedMinutes={minimumMinutes}
                teams={teams.map(({ team }) => team)}
                selectedTeamId={selectedTeam?.nhlTeamId}
                rollingGames={rollingGames}
                view={view}
                pageSize={pageSize}
                sort={sort}
                direction={direction}
              />
            </WorkspacePanel>
            <div className="mt-10">
              <nav className="workspace-subview-tabs" aria-label="Combination type">
                <Link href={unitViewHref(navigationParams, "lines")} aria-current={view === "lines" ? "page" : undefined}>
                  Forward Lines <span>{units.forwardLines.length}</span>
                </Link>
                <Link href={unitViewHref(navigationParams, "pairings")} aria-current={view === "pairings" ? "page" : undefined}>
                  Defensive Pairings <span>{units.defensivePairings.length}</span>
                </Link>
              </nav>
              <div id="combination-results">
                <SeasonUnitTables
                  data={{
                    forwardLines: view === "lines" ? unitPage.items : [],
                    defensivePairings: view === "pairings" ? unitPage.items : [],
                  }}
                  seasonId={selectedSeason.id}
                  only={view === "lines" ? "line" : "pairing"}
                  urlSort={{ key: sort, direction, scrollTarget: "combination-results" }}
                />
                <ResultNavigation
                  path="/lines"
                  params={navigationParams}
                  currentPage={unitPage.currentPage}
                  totalPages={unitPage.totalPages}
                  firstItem={unitPage.firstItem}
                  lastItem={unitPage.lastItem}
                  totalItems={unitPage.totalItems}
                  pageSize={pageSize}
                  scrollTarget="combination-results"
                />
              </div>
            </div>
            <p className="workspace-coverage-note mt-8">
              <strong>Coverage:</strong> Regular-season five-on-five data from{" "}
              <a
                href="https://moneypuck.com/"
                target="_blank"
                rel="noreferrer"
              >
                MoneyPuck.com
              </a>
              . Coverage begins in 2008–09.
            </p>
          </>
        ) : (
          <div className="workspace-empty-state mt-10">
            <strong>Combinations are unavailable for this season.</strong>
            <span>MoneyPuck line and pairing coverage begins in 2008–09.</span>
          </div>
        )}
      </section>
    </main>
  );
}

function CombinationFilters({
  seasonId,
  selectedMinutes,
  teams,
  selectedTeamId,
  rollingGames,
  view,
  pageSize,
  sort,
  direction,
}: {
  seasonId: number;
  selectedMinutes: number;
  teams: Array<{ nhlTeamId: number; name: string }>;
  selectedTeamId: number | undefined;
  rollingGames: (typeof WINDOW_OPTIONS)[number] | undefined;
  view: (typeof UNIT_VIEWS)[number];
  pageSize: number;
  sort: (typeof UNIT_SORTS)[number];
  direction: "asc" | "desc";
}) {
  return (
    <form
      method="get"
      className="workspace-unit-filter"
    >
      <input type="hidden" name="season" value={seasonId} />
      <input type="hidden" name="view" value={view} />
      <input type="hidden" name="perPage" value={pageSize} />
      <input type="hidden" name="sort" value={sort} />
      <input type="hidden" name="direction" value={direction} />
      <FilterHeader
        description="Narrow combinations by team, sample window, and shared ice time."
        activeCount={
          (selectedTeamId ? 1 : 0) +
          (rollingGames ? 1 : 0) +
          (selectedMinutes > 0 ? 1 : 0)
        }
      />
      <label>
        Team
        <select name="team" defaultValue={selectedTeamId ?? ""}>
          <option value="">All teams</option>
          {teams.map((team) => (
            <option key={team.nhlTeamId} value={team.nhlTeamId}>
              {team.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Sample
        <select name="window" defaultValue={rollingGames ?? ""}>
          <option value="">Full season</option>
          {WINDOW_OPTIONS.map((games) => (
            <option key={games} value={games}>
              Last {games} team games
            </option>
          ))}
        </select>
      </label>
      <label>
        Minimum five-on-five TOI
        <select
          name="minimum"
          defaultValue={selectedMinutes}
        >
          {ICE_TIME_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes === 0 ? "No minimum" : `${minutes} minutes`}
            </option>
          ))}
        </select>
      </label>
      <FilterActions clearHref={`/lines?season=${seasonId}&view=${view}&perPage=${pageSize}`} />
    </form>
  );
}

function unitViewHref(
  params: Record<string, string | number | undefined>,
  view: (typeof UNIT_VIEWS)[number],
): string {
  const search = new URLSearchParams();
  Object.entries({ ...params, view, page: undefined }).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });
  return `/lines?${search.toString()}#combination-results`;
}

function sortUnits(
  rows: MoneyPuckSeasonUnitStats[],
  sort: (typeof UNIT_SORTS)[number],
  direction: "asc" | "desc",
): MoneyPuckSeasonUnitStats[] {
  const value = (row: MoneyPuckSeasonUnitStats): string | number | null => ({
    team: row.team.name,
    players: row.players.map((player) => player.name).join(" "),
    games: row.gamesPlayed,
    iceTime: row.iceTimeSeconds,
    xgPercentage: row.expectedGoalsPercentage,
    corsiPercentage: row.corsiPercentage,
    xGoalsFor: row.expectedGoalsFor,
    xGoalsAgainst: row.expectedGoalsAgainst,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    shotsFor: row.shotsOnGoalFor,
    shotsAgainst: row.shotsOnGoalAgainst,
  })[sort];
  return [...rows].sort((left, right) => {
    const a = value(left);
    const b = value(right);
    if (a === null) return b === null ? 0 : 1;
    if (b === null) return -1;
    const comparison = typeof a === "number" && typeof b === "number"
      ? a - b
      : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
    return direction === "asc" ? comparison : -comparison;
  });
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
