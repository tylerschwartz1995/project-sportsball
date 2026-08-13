import Link from "next/link";

import { Pagination } from "@/app/_components/pagination";
import { PlayerDirectoryFilters } from "@/app/_components/player-directory-filters";
import { SeasonPicker } from "@/app/_components/season-picker";
import { SeasonPhaseFilter } from "@/app/_components/season-phase-filter";
import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { TeamLogoStack } from "@/app/_components/team-logo";
import {
  WorkspacePageHeader,
} from "@/app/_components/workspace-primitives";
import type {
  GoalieSeasonSummary,
  PlayerLocation,
  SkaterSeasonSummary,
} from "@/contracts/player";
import { parseSeasonId } from "@/contracts/season";
import {
  gameTypeForPhase,
  parseSeasonPhase,
  seasonPhaseLabel,
} from "@/contracts/season-phase";
import {
  listGoalieDirectoryPage,
  listSkaterDirectoryPage,
  type PlayerDirectoryPage,
} from "@/data/players";
import { listSeasons } from "@/data/seasons";
import {
  firstQueryValue,
  normalizeSearch,
  parsePage,
  parseSortDirection,
} from "@/lib/directory";
import {
  formatPlayerPosition,
  parsePlayerPositionFilter,
} from "@/lib/player-position";
import { playerDirectoryClearHref } from "@/lib/player-directory-url";

export const dynamic = "force-dynamic";

type PlayersPageProps = {
  searchParams: Promise<{
    season?: string | string[];
    q?: string | string[];
    type?: string | string[];
    sort?: string | string[];
    dir?: string | string[];
    page?: string | string[];
    phase?: string | string[];
    minGames?: string | string[];
    minGoals?: string | string[];
    minAssists?: string | string[];
    minPoints?: string | string[];
    minWins?: string | string[];
    minSavePercentage?: string | string[];
    country?: string | string[];
    region?: string | string[];
    city?: string | string[];
    position?: string | string[];
  }>;
};

export default async function PlayersPage({ searchParams }: PlayersPageProps) {
  const params = await searchParams;
  const seasons = await listSeasons();
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
    minGoals: firstQueryValue(params.minGoals) ?? "0",
    minAssists: firstQueryValue(params.minAssists) ?? "0",
    minPoints: firstQueryValue(params.minPoints) ?? "0",
    minWins: firstQueryValue(params.minWins) ?? "0",
    minSavePercentage: firstQueryValue(params.minSavePercentage) ?? "0",
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

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="players" />

      <section className="py-10">
        <WorkspacePageHeader
          eyebrow="Player statistics"
          title={`${selectedSeason?.label ?? "No Season"} Players`}
          description={`Official ${seasonPhaseLabel(phase).toLowerCase()} totals for every participating skater and goalie. Players who changed teams are combined into one row.`}
          action={
            <SeasonPicker
              seasons={seasons}
              selectedSeasonId={selectedSeason?.id}
              params={{
                phase,
                type: category,
                position: position || undefined,
              }}
            />
          }
        />

        {selectedSeason ? (
          <>
            <SeasonPhaseFilter
              active={phase}
              path="/players"
              params={{
                season: selectedSeason.id,
                type: category,
                position: position || undefined,
              }}
            />
            <PlayerDirectoryFilters
              seasonId={selectedSeason.id}
              phase={phase}
              category={category}
              query={query}
              position={position}
              sort={sort}
              sortOptions={sortOptions}
              direction={direction}
              locations={locations}
              filters={filters}
            />

            {category === "skaters" ? (
              <>
                <PlayerSectionHeader
                  id="player-results"
                  title="Skaters"
                  count={skaterPage.totalItems}
                  description="Combined totals across all teams played for."
                />
                {skaterPage.items.length > 0 ? (
                  <>
                    <div className="mt-5 grid gap-3 md:hidden">
                      {skaterPage.items.map((player) => (
                        <MobileSkaterCard
                          key={player.nhlPlayerId}
                          player={player}
                          seasonId={selectedSeason.id}
                          phase={phase}
                        />
                      ))}
                    </div>
                    <div className="workspace-data-table-shell hidden md:block">
                      <SortableTable
                        defaultSortKey={sort}
                        defaultDirection={direction}
                      >
                      <div className="overflow-x-auto">
                        <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[880px]">
                          <colgroup>
                            <col className="workspace-col-entity" />
                            <col className="workspace-col-stat" span={7} />
                            <col className="workspace-col-number" />
                          </colgroup>
                          <thead>
                            <tr className="workspace-data-table-header-row">
                              <SortableHeader
                                label="Player"
                                sortKey="name"
                                align="left"
                                defaultDirection="asc"
                              />
                              {skaterTableColumns.map((column) => (
                                <SortableHeader
                                  key={column.key}
                                  label={column.label}
                                  sortKey={column.key}
                                />
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {skaterPage.items.map((player) => (
                              <tr
                                key={player.nhlPlayerId}
                                className="workspace-data-table-row"
                              >
                                <td className="workspace-entity-name px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <TeamLogoStack
                                      teams={player.teams}
                                      size="tiny"
                                    />
                                    <div>
                                      <PlayerLink
                                        playerId={player.nhlPlayerId}
                                        seasonId={selectedSeason.id}
                                        name={player.name}
                                        phase={phase}
                                      />
                                      <span className="ml-2 text-xs text-slate-500">
                                        {formatPlayerPosition(player.position)}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <NumericCell value={player.gamesPlayed} />
                                <NumericCell value={player.goals} />
                                <NumericCell value={player.assists} />
                                <NumericCell value={player.points} highlight />
                                <NumericCell
                                  value={formatSigned(player.plusMinus)}
                                />
                                <NumericCell value={player.penaltyMinutes} />
                                <NumericCell value={player.shotsOnGoal} />
                                <NumericCell value={player.teamsPlayedFor} />
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      </SortableTable>
                    </div>
                    <Pagination
                      path="/players"
                      currentPage={skaterPage.currentPage}
                      totalPages={skaterPage.totalPages}
                      params={{
                        season: selectedSeason.id,
                        q: query,
                        position: position || undefined,
                        type: category,
                        sort,
                        dir: direction,
                        phase,
                        ...filters,
                      }}
                      scrollTarget="player-results"
                    />
                  </>
                ) : (
                  <DirectoryEmptyState
                    clearHref={playerDirectoryClearHref({
                      seasonId: selectedSeason.id,
                      phase,
                      category,
                      sort,
                      direction,
                    })}
                  />
                )}
              </>
            ) : (
              <>
                <PlayerSectionHeader
                  id="player-results"
                  title="Goalies"
                  count={goaliePage.totalItems}
                  description="Participating goalies only; dressed backups are excluded."
                />
                {goaliePage.items.length > 0 ? (
                  <>
                    <div className="mt-5 grid gap-3 md:hidden">
                      {goaliePage.items.map((player) => (
                        <MobileGoalieCard
                          key={player.nhlPlayerId}
                          player={player}
                          seasonId={selectedSeason.id}
                          phase={phase}
                        />
                      ))}
                    </div>
                    <div className="workspace-data-table-shell hidden md:block">
                      <SortableTable
                        defaultSortKey={sort}
                        defaultDirection={direction}
                      >
                      <div className="overflow-x-auto">
                        <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[880px]">
                          <colgroup>
                            <col className="workspace-col-entity" />
                            <col className="workspace-col-stat" span={7} />
                            <col className="workspace-col-percentage" />
                          </colgroup>
                          <thead>
                            <tr className="workspace-data-table-header-row">
                              <SortableHeader
                                label="Goalie"
                                sortKey="name"
                                align="left"
                                defaultDirection="asc"
                              />
                              {goalieTableColumns.map((column) => (
                                <SortableHeader
                                  key={column.key}
                                  label={column.label}
                                  sortKey={column.key}
                                />
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {goaliePage.items.map((player) => (
                              <tr
                                key={player.nhlPlayerId}
                                className="workspace-data-table-row"
                              >
                                <td className="workspace-entity-name px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <TeamLogoStack
                                      teams={player.teams}
                                      size="tiny"
                                    />
                                    <PlayerLink
                                      playerId={player.nhlPlayerId}
                                      seasonId={selectedSeason.id}
                                      name={player.name}
                                      phase={phase}
                                    />
                                  </div>
                                </td>
                                <NumericCell value={player.gamesPlayed} />
                                <NumericCell value={player.gamesStarted} />
                                <NumericCell value={player.wins} />
                                <NumericCell value={player.losses} />
                                <NumericCell value={player.overtimeLosses} />
                                <NumericCell value={player.goalsAgainst} />
                                <NumericCell value={player.saves} />
                                <NumericCell
                                  value={formatSavePercentage(
                                    player.savePercentage,
                                  )}
                                  highlight
                                />
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      </SortableTable>
                    </div>
                    <Pagination
                      path="/players"
                      currentPage={goaliePage.currentPage}
                      totalPages={goaliePage.totalPages}
                      params={{
                        season: selectedSeason.id,
                        q: query,
                        type: category,
                        sort,
                        dir: direction,
                        phase,
                        ...filters,
                      }}
                      scrollTarget="player-results"
                    />
                  </>
                ) : (
                  <DirectoryEmptyState
                    clearHref={playerDirectoryClearHref({
                      seasonId: selectedSeason.id,
                      phase,
                      category,
                      sort,
                      direction,
                    })}
                  />
                )}
              </>
            )}
          </>
        ) : (
          <div className="mt-10 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-6 text-amber-100">
            No player statistics are available for this season.
          </div>
        )}
      </section>
    </main>
  );
}

const skaterSortOptions = [
  { value: "points", label: "Points" },
  { value: "goals", label: "Goals" },
  { value: "assists", label: "Assists" },
  { value: "games", label: "Games played" },
  { value: "plusMinus", label: "Plus/minus" },
  { value: "penaltyMinutes", label: "Penalty minutes" },
  { value: "shotsOnGoal", label: "Shots" },
  { value: "teamsPlayedFor", label: "Teams played for" },
  { value: "name", label: "Player name" },
];

const goalieSortOptions = [
  { value: "savePercentage", label: "Save percentage" },
  { value: "wins", label: "Wins" },
  { value: "games", label: "Games played" },
  { value: "gamesStarted", label: "Games started" },
  { value: "losses", label: "Losses" },
  { value: "overtimeLosses", label: "Overtime losses" },
  { value: "goalsAgainst", label: "Goals against" },
  { value: "saves", label: "Saves" },
  { value: "name", label: "Player name" },
];

const skaterTableColumns = [
  { key: "games", label: "GP" },
  { key: "goals", label: "G" },
  { key: "assists", label: "A" },
  { key: "points", label: "PTS" },
  { key: "plusMinus", label: "+/-" },
  { key: "penaltyMinutes", label: "PIM" },
  { key: "shotsOnGoal", label: "S" },
  { key: "teamsPlayedFor", label: "Teams" },
];

const goalieTableColumns = [
  { key: "games", label: "GP" },
  { key: "gamesStarted", label: "GS" },
  { key: "wins", label: "W" },
  { key: "losses", label: "L" },
  { key: "overtimeLosses", label: "OTL" },
  { key: "goalsAgainst", label: "GA" },
  { key: "saves", label: "SV" },
  { key: "savePercentage", label: "SV%" },
];

function MobileSkaterCard({
  player,
  seasonId,
  phase,
}: {
  player: SkaterSeasonSummary;
  seasonId: number;
  phase: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <TeamLogoStack teams={player.teams} size="compact" prominent />
          <div>
            <PlayerLink
              playerId={player.nhlPlayerId}
              seasonId={seasonId}
              name={player.name}
              phase={phase}
            />
            <p className="mt-1 text-xs text-slate-500">
              {formatPlayerPosition(player.position, "Skater")} ·{" "}
              {player.gamesPlayed} games
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums text-cyan-200">
            {player.points}
          </p>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-600">
            points
          </p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-4 gap-3 border-t border-white/[0.06] pt-4">
        <MobilePlayerStat label="Goals" value={player.goals} />
        <MobilePlayerStat label="Assists" value={player.assists} />
        <MobilePlayerStat label="+/-" value={formatSigned(player.plusMinus)} />
        <MobilePlayerStat label="Shots" value={player.shotsOnGoal} />
      </dl>
    </article>
  );
}

function MobileGoalieCard({
  player,
  seasonId,
  phase,
}: {
  player: GoalieSeasonSummary;
  seasonId: number;
  phase: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <TeamLogoStack teams={player.teams} size="compact" prominent />
          <div>
            <PlayerLink
              playerId={player.nhlPlayerId}
              seasonId={seasonId}
              name={player.name}
              phase={phase}
            />
            <p className="mt-1 text-xs text-slate-500">
              {player.gamesPlayed} games · {player.gamesStarted} starts
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums text-cyan-200">
            {formatSavePercentage(player.savePercentage)}
          </p>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-600">
            save %
          </p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-4 gap-3 border-t border-white/[0.06] pt-4">
        <MobilePlayerStat label="Wins" value={player.wins} />
        <MobilePlayerStat label="Losses" value={player.losses} />
        <MobilePlayerStat label="OTL" value={player.overtimeLosses} />
        <MobilePlayerStat label="Saves" value={player.saves} />
      </dl>
    </article>
  );
}

function MobilePlayerStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <dt className="text-[0.65rem] uppercase tracking-[0.1em] text-slate-600">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium tabular-nums text-slate-200">
        {value}
      </dd>
    </div>
  );
}

function DirectoryEmptyState({ clearHref }: { clearHref: string }) {
  return (
    <div className="workspace-empty-state mt-5">
      <strong>No players match these filters.</strong>
      <span>Try a broader search or remove the optional filters.</span>
      <Link href={clearHref}>Clear filters</Link>
    </div>
  );
}

function PlayerSectionHeader({
  id,
  title,
  count,
  description,
}: {
  id: string;
  title: string;
  count: number;
  description: string;
}) {
  return (
    <div id={id} className="mt-12 scroll-mt-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h3 className="text-2xl font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <p className="text-sm text-slate-500">
        {count} {count === 1 ? "player" : "players"}
      </p>
    </div>
  );
}

function PlayerLink({
  playerId,
  seasonId,
  name,
  phase,
}: {
  playerId: number;
  seasonId: number | undefined;
  name: string;
  phase?: string;
}) {
  return (
    <Link
      href={`/players/${playerId}${seasonId ? `?season=${seasonId}${phase ? `&phase=${phase}` : ""}` : ""}`}
      className="font-medium text-white transition hover:text-cyan-200"
    >
      {name}
    </Link>
  );
}

function NumericCell({
  value,
  highlight = false,
}: {
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <td
      className={`workspace-semantic-number px-3 py-3 text-center tabular-nums ${
        highlight ? "font-semibold text-cyan-200" : "text-slate-300"
      }`}
    >
      {value}
    </td>
  );
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function formatSavePercentage(value: number | null): string {
  return value === null ? "—" : value.toFixed(3).replace(/^0/, "");
}

function parseMinimum(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function emptyDirectoryPage<Player>(): PlayerDirectoryPage<Player> {
  return {
    items: [],
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    firstItem: 0,
    lastItem: 0,
    locations: [] satisfies PlayerLocation[],
  };
}
