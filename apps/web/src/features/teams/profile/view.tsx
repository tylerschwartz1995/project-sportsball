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
import { TeamRollingPerformanceChart } from "@/features/charts/lazy-charts";
import { SeasonPhaseFilter } from "@/features/league/season-phase-filter";
import { SeasonPicker } from "@/features/league/season-picker";
import { ScheduleStrength } from "@/features/teams/schedule-strength";
import {
  TeamFullSchedule
} from "@/features/teams/team-full-schedule";
import { TeamLogo } from "@/features/teams/team-logo";
import { TeamSeasonIdentity } from "@/features/teams/team-season-identity";
import { TeamUnitViews } from "@/features/teams/team-unit-views";
import { formatPlayerPosition } from "@/lib/player-position";
import type { loadTeamPage } from './loader';
import { formatDecimal, formatSavePercentage, formatSigned } from './logic';
import { NumericCell } from './sections';
export function TeamPageView({
  scheduleGames,
  scheduleStrength,
  gameLog,
  advanced,
  units,
  selectedSeason,
  phase,
  profileDetail,
  availableSeasons,
  scheduleStrengthMetric,
  view,
  scheduleFilter,
  chartParams,
  viewTabs,
  overviewIdentity,
  overviewStats,
  gameType,
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
                <div className="mt-4 flex flex-wrap gap-2 text-sm text-[var(--muted)]">
                  <Link
                    href={`/drafts?view=board&year=all&team=${profileDetail.team.abbreviation}`}
                    className="rounded-full border border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] bg-[var(--accent-soft)] px-3 py-1 font-medium text-[var(--accent)] transition hover:border-[color-mix(in_srgb,var(--accent)_64%,var(--border))] hover:text-[var(--foreground)]"
                  >
                    Draft history →
                  </Link>
                </div>
              </div>
            </div>
            <SeasonPicker
              seasons={availableSeasons}
              selectedSeasonId={selectedSeason.id}
              params={{
                phase,
                sos: scheduleStrengthMetric,
                view,
                scheduleState: view === "schedule" ? scheduleFilter : undefined,
                ...chartParams,
              }}
              className="relative !max-w-none border-[var(--border)] bg-[var(--table-background)]"
            />
          </div>
        </div>

        <ViewTabs
          active={
            view === "strength"
              ? "schedule"
              : view === "goalies"
                ? "skaters"
                : view
          }
          ariaLabel={`${profileDetail.team.name} views`}
          label="Profile view"
          tabs={viewTabs
            .filter((tab) => tab.id !== "strength" && tab.id !== "goalies")
            .map((tab) =>
              tab.id === "skaters" ? { ...tab, label: "Players" } : tab,
            )}
        />

        <SeasonPhaseFilter
          active={phase}
          path={`/teams/${profileDetail.team.nhlTeamId}`}
          params={{
            season: selectedSeason.id,
            sos: scheduleStrengthMetric,
            view,
            scheduleState: view === "schedule" ? scheduleFilter : undefined,
            ...chartParams,
          }}
        />

        {view === "schedule" || view === "strength" ? (
          <ViewTabs
            active={view}
            ariaLabel="Schedule views"
            tabs={viewTabs
              .filter((tab) => tab.id === "schedule" || tab.id === "strength")
              .map((tab) =>
                tab.id === "strength"
                  ? { ...tab, label: "Schedule Difficulty" }
                  : tab,
              )}
            secondary
          />
        ) : null}
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
        {view === "overview" ? (
          overviewIdentity && overviewStats ? (
            <>
              <p className="mt-6 text-lg tabular-nums">
                {phase === "regular"
                  ? `${overviewStats.wins}–${overviewStats.regulationLosses}–${overviewStats.overtimeLosses + overviewStats.shootoutLosses} · ${overviewStats.standingsPoints} PTS`
                  : `${overviewStats.wins}–${overviewStats.losses}`}
              </p>
              <TeamSeasonIdentity
                identity={overviewIdentity}
                seasonId={selectedSeason.id}
                phase={phase}
                phaseLabel={seasonPhaseLabel(phase)}
              />
            </>
          ) : (
            <div className="workspace-empty-state mt-8">
              This team did not participate in the selected phase.
            </div>
          )
        ) : null}

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

        {view === "strength" && scheduleStrength ? (
          <ScheduleStrength
            data={scheduleStrength}
            metric={scheduleStrengthMetric}
          />
        ) : null}

        {view === "strength" && !scheduleStrength ? (
          <div className="workspace-empty-state mt-8">
            Schedule-strength data is not available for this selection.
          </div>
        ) : null}

        {view === "trends" ? (
          <section className="workspace-width-data mt-8">
            <SectionHeader
              eyebrow="Rolling performance"
              title="Team Form"
              description="Actual goal share shows the scoreboard result. Five-on-five expected-goal share estimates which team created the stronger shot quality; above 50% means this team held the edge."
              tone="violet"
            />
            <div className="workspace-chart-panel mt-6">
              <TeamRollingPerformanceChart
                games={
                  gameLog?.games
                    .filter((game) => game.gameType === gameType)
                    .map((game) => ({
                      nhlGameId: game.nhlGameId,
                      gameDate: game.gameDate,
                      isHome: game.isHome,
                      opponent: game.opponent,
                      score: game.score,
                      opponentScore: game.opponentScore,
                      result: game.result,
                      fiveOnFiveXGoalsFor: game.fiveOnFiveXGoalsFor,
                      fiveOnFiveXGoalsAgainst: game.fiveOnFiveXGoalsAgainst,
                    })) ?? []
                }
                teamName={profileDetail.team.name}
              />
            </div>
          </section>
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
                <div className="overflow-x-auto">
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
                </div>
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
                <div className="overflow-x-auto">
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
                </div>
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

        {view === "combinations" ? (
          <section className="mt-8">
            <SectionHeader
              eyebrow="Five-on-five combinations"
              title="Season Lines and Pairings"
              description="Combinations with at least 50 minutes together."
              tone="violet"
              action={
                <Link
                  href={`/lines?season=${selectedSeason.id}&minimum=100`}
                  className="text-sm font-medium text-[var(--accent)] transition hover:text-[var(--foreground)]"
                >
                  View league rankings →
                </Link>
              }
            />
            <div className="mt-6">
              <TeamUnitViews
                data={units ?? { forwardLines: [], defensivePairings: [] }}
                seasonId={selectedSeason.id}
                showTeam={false}
              />
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
