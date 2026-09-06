import { NavigationComplete } from "@/components/shell/navigation-metrics";
import { SiteHeader } from "@/components/shell/site-header";
import { MobileDataView } from "@/components/ui/mobile-data-view";
import { Pagination } from "@/components/ui/pagination";
import { SortableHeader } from "@/components/ui/sortable-header";
import { SortableTable } from "@/components/ui/sortable-table";
import {
  WorkspacePageHeader,
} from "@/components/ui/workspace-primitives";
import {
  seasonPhaseLabel
} from "@/contracts/season-phase";
import { SeasonPhaseFilter } from "@/features/league/season-phase-filter";
import { SeasonPicker } from "@/features/league/season-picker";
import { PlayerDirectoryFilters } from "@/features/players/player-directory-filters";
import { TeamLogoStack } from "@/features/teams/team-logo";
import { playerDirectoryClearHref } from "@/lib/player-directory-url";
import {
  formatPlayerPosition
} from "@/lib/player-position";
import type { loadPlayersPage } from './loader';
import { formatSavePercentage, formatSigned, goalieTableColumns, skaterTableColumns } from './logic';
import { DirectoryEmptyState, NumericCell, PlayerLink, PlayerSectionHeader } from './sections';
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
  locations,
  filters,
  skaterPage,
  goaliePage,
  minGames,
}: Awaited<ReturnType<typeof loadPlayersPage>>) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="players" />

      <section className="py-10">
        <WorkspacePageHeader
          eyebrow="Player statistics"
          title={`${selectedSeason?.label ?? "No Season"} Players`}
          description={`Official ${seasonPhaseLabel(phase).toLowerCase()} statistics, combined across teams.`}
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
            <SeasonPhaseFilter
              active={phase}
              path="/players"
              params={{ ...contextParams, season: selectedSeason.id }}
            />
            <PlayerDirectoryFilters
              key={JSON.stringify([selectedSeason.id, contextParams])}
              seasonId={selectedSeason.id}
              phase={phase}
              category={category}
              query={query}
              position={position}
              sort={sort}
              direction={direction}
              locations={locations}
              filters={filters}
            />

            <MobileDataView>
              {category === "skaters" ? (
                <>
                  <PlayerSectionHeader
                    id="player-results"
                    title="Skaters"
                    count={skaterPage.totalItems}
                    description="Combined totals across all teams played for."
                  />
                  {skaterPage.items.length > 0 ? (
                    <><div className="workspace-data-table-shell min-w-0">
                        <SortableTable
                          secondaryColumns={[6, 7, 9]}
                          initialExpanded={[
                            "plusMinus",
                            "penaltyMinutes",
                            "teamsPlayedFor",
                          ].includes(sort)}
                          defaultSortKey={sort}
                          defaultDirection={direction}
                        >
                          <div className="overflow-x-auto">
                            <table className="modern-table-readable workspace-table workspace-table-dense workspace-table-semantic min-w-[880px]">
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
                                          <span className="ml-2 text-xs text-[var(--muted)]">
                                            {formatPlayerPosition(
                                              player.position,
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                    </td>
                                    <NumericCell value={player.gamesPlayed} />
                                    <NumericCell value={player.goals} />
                                    <NumericCell value={player.assists} />
                                    <NumericCell
                                      value={player.points}
                                      highlight
                                    />
                                    <NumericCell
                                      value={formatSigned(player.plusMinus)}
                                    />
                                    <NumericCell
                                      value={player.penaltyMinutes}
                                    />
                                    <NumericCell value={player.shotsOnGoal} />
                                    <NumericCell
                                      value={player.teamsPlayedFor}
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
                  <PlayerSectionHeader
                    id="player-results"
                    title="Goalies"
                    count={goaliePage.totalItems}
                    description={
                      minGames === 0
                        ? "Unqualified save-percentage ranking · No minimum games. Totals combine all teams."
                        : "Combined totals across all teams played for."
                    }
                  />
                  {goaliePage.items.length > 0 ? (
                    <><div className="workspace-data-table-shell min-w-0">
                        <SortableTable
                          secondaryColumns={[3, 5, 6, 7, 8]}
                          initialExpanded={[
                            "gamesStarted",
                            "losses",
                            "overtimeLosses",
                            "goalsAgainst",
                            "saves",
                          ].includes(sort)}
                          defaultSortKey={sort}
                          defaultDirection={direction}
                        >
                          <div className="overflow-x-auto">
                            <table className="modern-table-readable workspace-table workspace-table-dense workspace-table-semantic min-w-[880px]">
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
                                    <NumericCell
                                      value={player.overtimeLosses}
                                    />
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
            </MobileDataView>
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
