import { TeamStatsTable } from "@/features/teams/team-stats-table";
import { TableScroll } from "@/components/ui/table-scroll";
import { NavigationComplete } from "@/components/shell/navigation-metrics";
import { SiteHeader } from "@/components/shell/site-header";
import Link, { ReturnLink } from "@/components/ui/exploration-link";
import { SortableHeader } from "@/components/ui/sortable-header";
import { SortableTable } from "@/components/ui/sortable-table";
import {
  DataTableShell,
  SectionHeader,
} from "@/components/ui/ui-primitives";
import {
  ViewTabs
} from "@/components/ui/view-tabs";
import {
  seasonPhaseLabel
} from "@/contracts/season-phase";
import { TeamAdvancedAnalytics } from "@/features/analytics/advanced-analytics";
import { SeasonPhaseFilter } from "@/features/league/season-phase-filter";
import { SeasonPicker } from "@/features/league/season-picker";
import {
  TeamFullSchedule
} from "@/features/teams/team-full-schedule";
import { TeamLogo } from "@/features/teams/team-logo";
import { formatPlayerPosition } from "@/lib/player-position";
import type { loadTeamPage } from './loader';
import { formatDecimal, formatSavePercentage, formatSigned } from './logic';
import { NumericCell } from './sections';
export function TeamPageView({
  scheduleGames,
  advanced,
  selectedSeason,
  phase,
  profileDetail,
  availableSeasons,
  view,
  scheduleFilter,
  viewTabs,
  overviewStats,
}: Awaited<ReturnType<typeof loadTeamPage>>) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="teams" />

      <section className="py-8 sm:py-10">
        <ReturnLink
          fallback={`/teams?season=${selectedSeason.id}&phase=${phase}`}
        >
          <span aria-hidden="true">←</span> All teams
        </ReturnLink>

        <div className="modern-profile-identity modern-team-identity relative mt-6">
          <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_12rem] lg:items-end">
            <div className="modern-team-name flex items-center gap-4">
              <TeamLogo
                name={profileDetail.team.name}
                abbreviation={profileDetail.team.abbreviation}
                nhlTeamId={profileDetail.team.nhlTeamId}
              />
              <div>
                <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] text-[var(--foreground)] sm:text-5xl">
                  {profileDetail.team.name}
                </h1>

              </div>
            </div>
            <SeasonPicker
              seasons={availableSeasons}
              selectedSeasonId={selectedSeason.id}
              params={{
                phase,
                view,
                scheduleState: view === "schedule" ? scheduleFilter : undefined,
              }}
              className="relative !max-w-none border-[var(--border)] bg-[var(--table-background)]"
            />
          </div>
        </div>

        <ViewTabs
          active={
            view === "goalies" ? "skaters" : view
          }
          ariaLabel={`${profileDetail.team.name} views`}
          label="Profile view"
          tabs={viewTabs
            .filter((tab) => tab.id !== "goalies")
            .map((tab) =>
              tab.id === "skaters" ? { ...tab, label: "Players" } : tab,
            )}
        />

        <SeasonPhaseFilter
          active={phase}
          path={`/teams/${profileDetail.team.nhlTeamId}`}
          params={{
            season: selectedSeason.id,
            view,
            scheduleState: view === "schedule" ? scheduleFilter : undefined,
          }}
        />

        {view === "skaters" || view === "goalies" ? (
          <ViewTabs
            active={view}
            ariaLabel="Player type"
            tabs={viewTabs.filter(
              (tab) => tab.id === "skaters" || tab.id === "goalies",
            )}
            secondary
          />
        ) : null}
        {view === "overview" ? overviewStats ? <TeamStatsTable rows={[{ team: profileDetail.team, stats: overviewStats }]} seasonId={selectedSeason.id} phase={phase} /> : <p className="workspace-empty-state">No stats are available for this phase.</p> : null}

        {view === "schedule" ? (
          <>
            <TeamFullSchedule
              games={scheduleGames}
              teamNhlId={profileDetail.team.nhlTeamId}
              seasonId={selectedSeason.id}
              seasonLabel={selectedSeason.label}
              phase={phase}
              phaseLabel={seasonPhaseLabel(phase)}
              filter={scheduleFilter}
            />
            <Link
              href={`/teams/${profileDetail.team.nhlTeamId}/games?season=${selectedSeason.id}&phase=${phase}`}
              className="workspace-secondary-action mt-5"
            >
              Detailed Game Log →
            </Link>
          </>
        ) : null}

        {view === "skaters" ? (
          <section className="workspace-width-standard mt-8">
            <SectionHeader
              eyebrow="Official NHL splits"
              title="Skaters"
              description={`Traditional ${seasonPhaseLabel(phase).toLowerCase()} production for every player who appeared with this team.`}
              action={
                <p className="text-sm tabular-nums text-[var(--muted)]">
                  {profileDetail.skaters.length} skaters
                </p>
              }
            />
            <DataTableShell>
              <SortableTable defaultSortKey="points">
                <TableScroll className="overflow-x-auto">
                  <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[720px]">
                    <colgroup>
                      <col className="workspace-col-entity" />
                      <col className="workspace-col-number" span={6} />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-left text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                        <SortableHeader
                          label="Player"
                          sortKey="player"
                          align="left"
                          defaultDirection="asc"
                        />
                        <SortableHeader label="GP" sortKey="games" />
                        <SortableHeader label="G" sortKey="goals" />
                        <SortableHeader label="A" sortKey="assists" />
                        <SortableHeader label="PTS" sortKey="points" />
                        <SortableHeader label="+/-" sortKey="plusMinus" />
                        <SortableHeader label="PIM" sortKey="penaltyMinutes" />
                      </tr>
                    </thead>
                    <tbody>
                      {profileDetail.skaters.map((player) => (
                        <tr
                          key={`${player.nhlPlayerId}-${player.gamesPlayed}`}
                          className="border-b border-[var(--border)] text-[var(--foreground-soft)] last:border-0 hover:bg-[var(--surface-subtle)]"
                        >
                          <td className="px-4 py-3">
                            <div>
                              <Link
                                href={`/players/${player.nhlPlayerId}?season=${selectedSeason.id}`}
                                className="workspace-entity-name font-medium text-[var(--foreground)] transition hover:text-[var(--accent)]"
                              >
                                {player.name}
                              </Link>
                              <span className="ml-2 text-xs text-[var(--muted)]">
                                {formatPlayerPosition(player.position)}
                              </span>
                            </div>
                          </td>
                          <NumericCell value={player.gamesPlayed} />
                          <NumericCell value={player.goals} />
                          <NumericCell value={player.assists} />
                          <NumericCell value={player.points} highlight />
                          <NumericCell value={formatSigned(player.plusMinus)} />
                          <NumericCell value={player.penaltyMinutes} />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
              </SortableTable>
            </DataTableShell>
          </section>
        ) : null}

        {view === "goalies" ? (
          <section className="workspace-width-standard mt-8">
            <SectionHeader
              eyebrow="Official NHL splits"
              title="Goalies"
              description={`Traditional ${seasonPhaseLabel(phase).toLowerCase()} appearances, decisions, and save results.`}
              action={
                <p className="text-sm tabular-nums text-[var(--muted)]">
                  {profileDetail.goalies.length} goalies
                </p>
              }
            />
            <DataTableShell>
              <SortableTable defaultSortKey="savePercentage">
                <TableScroll className="overflow-x-auto">
                  <table className="modern-table-readable workspace-table workspace-table-dense workspace-table-semantic min-w-[760px]">
                    <colgroup>
                      <col className="workspace-col-entity" />
                      <col className="workspace-col-number" span={6} />
                      <col className="workspace-col-percentage" />
                      <col className="workspace-col-number" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-left text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                        <SortableHeader
                          label="Goalie"
                          sortKey="goalie"
                          align="left"
                          defaultDirection="asc"
                        />
                        <SortableHeader label="GP" sortKey="games" />
                        <SortableHeader label="GS" sortKey="starts" />
                        <SortableHeader label="W" sortKey="wins" />
                        <SortableHeader label="L" sortKey="losses" />
                        <SortableHeader label="OTL" sortKey="overtimeLosses" />
                        <SortableHeader
                          label="GAA"
                          sortKey="goalsAgainstAverage"
                          defaultDirection="asc"
                        />
                        <SortableHeader label="SV%" sortKey="savePercentage" />
                        <SortableHeader label="SO" sortKey="shutouts" />
                      </tr>
                    </thead>
                    <tbody>
                      {profileDetail.goalies.map((player) => (
                        <tr
                          key={`${player.nhlPlayerId}-${player.gamesPlayed}`}
                          className="border-b border-[var(--border)] text-[var(--foreground-soft)] last:border-0 hover:bg-[var(--surface-subtle)]"
                        >
                          <td className="px-4 py-3">
                            <div>
                              <Link
                                href={`/players/${player.nhlPlayerId}?season=${selectedSeason.id}`}
                                className="workspace-entity-name font-medium text-[var(--foreground)] transition hover:text-[var(--accent)]"
                              >
                                {player.name}
                              </Link>
                            </div>
                          </td>
                          <NumericCell value={player.gamesPlayed} />
                          <NumericCell value={player.gamesStarted} />
                          <NumericCell value={player.wins} />
                          <NumericCell value={player.losses} />
                          <NumericCell value={player.overtimeLosses} />
                          <NumericCell
                            value={formatDecimal(player.goalsAgainstAverage, 2)}
                          />
                          <NumericCell
                            value={formatSavePercentage(player.savePercentage)}
                            highlight
                          />
                          <NumericCell value={player.shutouts} />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
              </SortableTable>
            </DataTableShell>
          </section>
        ) : null}

        {view === "advanced" ? (
          <div>
            <TeamAdvancedAnalytics
              data={advanced}
              seasonId={selectedSeason.id}
            />
          </div>
        ) : null}

      </section>
    <NavigationComplete />
    </main>
  );
}
