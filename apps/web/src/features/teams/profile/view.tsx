import { formatPercentage, formatSignedDecimal } from "@/features/analytics/directory/logic";
import { TeamLinesSelector } from "@/features/teams/team-lines-selector";
import { TableScroll } from "@/components/ui/table-scroll";
import { NavigationComplete } from "@/components/shell/navigation-metrics";
import { SiteHeader } from "@/components/shell/site-header";
import Link from "@/components/ui/exploration-link";
import { SortableHeader } from "@/components/ui/sortable-header";
import { SortableTable } from "@/components/ui/sortable-table";
import {
  DataTableShell,
} from "@/components/ui/ui-primitives";
import {
  ViewTabs
} from "@/components/ui/view-tabs";
import { TeamAdvancedAnalytics } from "@/features/analytics/team-advanced-analytics";
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
  forwardLines,
  defensivePairings,
  skaterAdvanced,
  goalieAdvanced,
  advanced,
  selectedSeason,
  phase,
  profileDetail,
  availableSeasons,
  view,
  viewTabs,
  overviewStats,
}: Awaited<ReturnType<typeof loadTeamPage>>) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="teams" />

      <section className="py-8 sm:py-10">
        <div className="modern-profile-identity modern-team-identity relative">
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
                {overviewStats ? <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[var(--muted)] tabular-nums">
                  <span>{phase === "regular" ? `${overviewStats.wins}–${overviewStats.regulationLosses}–${overviewStats.overtimeLosses + overviewStats.shootoutLosses}` : `${overviewStats.wins}–${overviewStats.losses}`}</span>
                  {phase === "regular" ? <span>{overviewStats.standingsPoints} PTS</span> : null}
                  <span>{formatSigned(overviewStats.goalsFor - overviewStats.goalsAgainst)} DIFF</span>
                  <span>PP {formatPercentage(overviewStats.powerPlayPercentage ?? null)}</span>
                  <span>PK {formatPercentage(overviewStats.penaltyKillPercentage ?? null)}</span>
                </p> : null}

              </div>
            </div>
            <SeasonPicker
              seasons={availableSeasons}
              selectedSeasonId={selectedSeason.id}
              params={{
                phase,
                view,
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
        {view === "lines" ? <div className="mt-8 space-y-8">
          {phase === "playoffs" ? <p className="workspace-empty-state">Playoff line data is not available.</p> : <TeamLinesSelector
            forwards={forwardLines}
            defense={defensivePairings}
            seasonId={selectedSeason.id}
          />}
        </div> : null}

        {view === "schedule" ? (
          <>
            <TeamFullSchedule
              games={scheduleGames}
              teamNhlId={profileDetail.team.nhlTeamId}
              seasonId={selectedSeason.id}
              phase={phase}
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
            <DataTableShell>
              <SortableTable defaultSortKey="points">
                <TableScroll className="overflow-x-auto">
                  <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[940px]">
                    <colgroup>
                      <col className="workspace-col-entity" />
                      <col className="workspace-col-number" span={10} />
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
                        <SortableHeader label="S" sortKey="shots" description="Shots on goal for this team in the selected season and phase." />
                        <SortableHeader label="PPP" sortKey="powerPlayPoints" description="Power-play points: goals and assists recorded on the power play for this team in the selected season and phase." />
                        <SortableHeader label="PIM" sortKey="penaltyMinutes" />
                        <SortableHeader label="xG%" sortKey="xgPercentage" nowrap description="Expected-goal share while this player is on the ice at 5-on-5, for this team and regular season." />
                        <SortableHeader label="ixG" sortKey="individualXGoals" nowrap description="Individual expected goals at 5-on-5, for this team and regular season." />
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
                          <NumericCell value={player.shots ?? null} />
                          <NumericCell value={player.powerPlayPoints ?? null} />
                          <NumericCell value={player.penaltyMinutes} />
                          <NumericCell value={formatPercentage(skaterAdvanced[player.nhlPlayerId]?.onIceExpectedGoalsPercentage ?? null)} />
                          <NumericCell value={formatDecimal(skaterAdvanced[player.nhlPlayerId]?.individualExpectedGoals ?? null, 2)} />
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
            <DataTableShell>
              <SortableTable defaultSortKey="savePercentage">
                <TableScroll className="overflow-x-auto">
                  <table className="modern-table-readable workspace-table workspace-table-dense workspace-table-semantic min-w-[1100px]">
                    <colgroup>
                      <col className="workspace-col-entity" />
                      <col className="workspace-col-number" span={5} />
                      <col className="workspace-col-percentage" />
                      <col className="workspace-col-number" span={2} />
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
                        <SortableHeader label="GSAx/60" sortKey="goalsSavedPer60" nowrap />
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
                          <NumericCell value={formatSignedDecimal(goalieAdvanced[player.nhlPlayerId]?.goalsSavedPer60 ?? null)} />
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
