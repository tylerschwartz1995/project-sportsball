import { StatsTabs } from "@/components/ui/stats-tabs";
import { TableScroll } from "@/components/ui/table-scroll";
import { NavigationComplete } from "@/components/shell/navigation-metrics";
import { SiteHeader } from "@/components/shell/site-header";
import { Pagination } from "@/components/ui/pagination";
import { SortableHeader } from "@/components/ui/sortable-header";
import { SortableTable } from "@/components/ui/sortable-table";
import {
  WorkspacePageHeader,
} from "@/components/ui/workspace-primitives";
import { SeasonPhaseFilter } from "@/features/league/season-phase-filter";
import { SeasonPicker } from "@/features/league/season-picker";
import { PlayerDirectoryFilters } from "@/features/players/player-directory-filters";
import { PlayerTableIdentity } from "@/features/players/player-table-identity";
import { playerDirectoryClearHref } from "@/lib/player-directory-url";
import {
  formatPlayerPosition
} from "@/lib/player-position";
import type { loadPlayersPage } from './loader';
import { formatSavePercentage, formatSigned, goalieTableColumns, skaterTableColumns } from './logic';
import { DirectoryEmptyState, NumericCell } from './sections';
export function PlayersPageView({
  selectedSeason,
  phase,
  seasons,
  contextParams,
  category,
  query,
  position,
  sort,
  direction,
  filters,
  skaterPage,
  goaliePage,
}: Awaited<ReturnType<typeof loadPlayersPage>>) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="players" />

      <section className="py-10">
        <WorkspacePageHeader
          eyebrow="Player statistics"
          title="Player Stats"
          description=""
          action={
            <SeasonPicker
              seasons={seasons}
              selectedSeasonId={selectedSeason?.id}
              params={contextParams}
            />
          }
        />

        {selectedSeason ? (
          <>
            <div className="reference-stats-context"><StatsTabs subject="players" seasonId={selectedSeason.id} phase={phase} type={category} />
            <SeasonPhaseFilter
              active={phase}
              path="/players"
              params={{ ...contextParams, season: selectedSeason.id }}
            /></div>
            <PlayerDirectoryFilters
              key={JSON.stringify([selectedSeason.id, contextParams])}
              seasonId={selectedSeason.id}
              phase={phase}
              category={category}
              query={query}
              position={position}
              sort={sort}
              direction={direction}
            />

            <div id="player-results" className="scroll-mt-6">
              {category === "skaters" ? (
                <>

                  {skaterPage.items.length > 0 ? (
                    <><div className="workspace-data-table-shell min-w-0">
                        <SortableTable
                          defaultSortKey={sort}
                          defaultDirection={direction}
                        >
                          <TableScroll className="overflow-x-auto">
                            <table className="modern-table-readable workspace-table workspace-table-dense workspace-table-semantic min-w-[880px]">
                              <colgroup>
                                <col className="workspace-col-entity" />
                                <col className="workspace-col-stat" span={skaterTableColumns.length} />
                              </colgroup>
                              <thead>
                                <tr className="workspace-data-table-header-row">
                                  <SortableHeader
                                    label="Player"
                                    sticky
                                    sortKey="name"
                                    align="left"
                                    defaultDirection="asc"
                                  />
                                  {skaterTableColumns.map((column) => (
                                    <SortableHeader
                                      key={column.key}
                                      label={column.label}
                                      sortKey={column.key}
                                      defaultDirection={column.key === "goalsAgainstAverage" ? "asc" : "desc"}
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
                                    <td className="workspace-sticky-entity workspace-entity-name px-4 py-3">
                                      <PlayerTableIdentity
                                        href={`/players/${player.nhlPlayerId}?season=${selectedSeason.id}&phase=${phase}`}
                                        name={player.name}
                                        position={formatPlayerPosition(player.position)}
                                        teams={player.teams}
                                      />
                                    </td>
                                    <NumericCell value={player.gamesPlayed} />
                                    <NumericCell value={player.goals} />
                                    <NumericCell value={player.assists} />
                                    <NumericCell value={player.points} highlight />
                                    <NumericCell value={formatSigned(player.plusMinus)} />
                                    <NumericCell value={player.shotsOnGoal} />
                                    <NumericCell value={player.powerPlayPoints ?? "—"} />
                                    <NumericCell value={player.penaltyMinutes} />
                                    <NumericCell value={player.hits} />
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </TableScroll>
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
                      query={query}
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

                  {goaliePage.items.length > 0 ? (
                    <><div className="workspace-data-table-shell min-w-0">
                        <SortableTable
                          defaultSortKey={sort}
                          defaultDirection={direction}
                        >
                          <TableScroll className="overflow-x-auto">
                            <table className="modern-table-readable workspace-table workspace-table-dense workspace-table-semantic min-w-[880px]">
                              <colgroup>
                                <col className="workspace-col-entity" />
                                <col className="workspace-col-stat" span={goalieTableColumns.length} />
                              </colgroup>
                              <thead>
                                <tr className="workspace-data-table-header-row">
                                  <SortableHeader
                                    label="Goalie"
                                    sticky
                                    sortKey="name"
                                    align="left"
                                    defaultDirection="asc"
                                  />
                                  {goalieTableColumns.map((column) => (
                                    <SortableHeader
                                      key={column.key}
                                      label={column.label}
                                      sortKey={column.key}
                                      defaultDirection={column.key === "goalsAgainstAverage" ? "asc" : "desc"}
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
                                    <td className="workspace-sticky-entity workspace-entity-name px-4 py-3">
                                      <PlayerTableIdentity
                                        href={`/players/${player.nhlPlayerId}?season=${selectedSeason.id}&phase=${phase}`}
                                        name={player.name}
                                        position={"G"}
                                        teams={player.teams}
                                      />
                                    </td>
                                    <NumericCell value={player.gamesPlayed} />
                                    <NumericCell value={formatSavePercentage(player.savePercentage)} />
                                    <NumericCell value={player.timeOnIceSeconds > 0 ? (player.goalsAgainst * 3600 / player.timeOnIceSeconds).toFixed(2) : "—"} />
                                    <NumericCell value={player.wins} />
                                    <NumericCell value={player.losses} />
                                    <NumericCell value={player.overtimeLosses} />
                                    <NumericCell value={player.shutouts ?? "—"} />
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </TableScroll>
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
                      query={query}
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
            </div>
          </>
        ) : (
          <div className="mt-10 rounded-2xl border border-[color-mix(in_srgb,var(--warning)_42%,var(--border))] bg-[var(--warning-soft)] p-6 text-[var(--warning)]">
            No player statistics are available for this season.
          </div>
        )}
      </section>
    <NavigationComplete />
    </main>
  );
}
