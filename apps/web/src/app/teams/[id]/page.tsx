import { ReturnLink } from "@/app/_components/exploration-link";
import Link from "@/app/_components/exploration-link";
import { notFound } from "next/navigation";

import { TeamAdvancedAnalytics } from "@/app/_components/advanced-analytics";
import { SeasonPicker } from "@/app/_components/season-picker";
import { SeasonPhaseFilter } from "@/app/_components/season-phase-filter";
import { ScheduleStrength } from "@/app/_components/schedule-strength";
import { TeamUnitViews } from "@/app/_components/team-unit-views";
import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { TeamLogo } from "@/app/_components/team-logo";
import {
  TeamFullSchedule,
  type TeamScheduleFilter,
} from "@/app/_components/team-full-schedule";
import { TeamSeasonIdentity } from "@/app/_components/team-season-identity";
import { TeamRollingPerformanceChart } from "@/app/_components/lazy-charts";
import {
  ViewTabs,
  type ViewTab,
} from "@/app/_components/view-tabs";
import {
  DataTableShell,
  SectionHeader,
} from "@/app/_components/ui-primitives";
import { parseNhlId } from "@/contracts/entity";
import { parseSeasonId } from "@/contracts/season";
import { parseScheduleStrengthMetric } from "@/contracts/schedule-strength";
import {
  gameTypeForPhase,
  parseSeasonPhase,
  seasonPhaseLabel,
} from "@/contracts/season-phase";
import { getMoneyPuckTeamSeason } from "@/data/advanced";
import { getTeamSchedule } from "@/data/games";
import {
  getCachedTeamGameLog,
  getCachedTeamIdentityForSeason,
  getCachedTeamScheduleStrength,
  getCachedTeamSeasonDetail,
  getCachedTeamSeasonProfile,
  listCachedScheduleSeasons,
  listCachedSeasons,
  listCachedTeamScheduleSeasonIds,
  listCachedTeamSeasonIds,
  listCachedTeamsBySeason,
} from "@/data/page-cache";
import { getMoneyPuckSeasonUnitLeaders } from "@/data/season-units";
import { formatPlayerPosition } from "@/lib/player-position";
import { buildTeamSeasonIdentity } from "@/lib/team-season-identity";

export const dynamic = "force-dynamic";

type TeamView =
  | "overview"
  | "schedule"
  | "strength"
  | "trends"
  | "skaters"
  | "goalies"
  | "advanced"
  | "combinations";

type TeamPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    season?: string | string[];
    phase?: string | string[];
    sos?: string | string[];
    view?: string | string[];
    chartWindow?: string | string[];
    chartVenue?: string | string[];
    showGoals?: string | string[];
    showExpectedGoals?: string | string[];
    scheduleState?: string | string[];
  }>;
};

export default async function TeamPage({
  params,
  searchParams,
}: TeamPageProps) {
  const nhlTeamId = parseNhlId((await params).id);
  if (nhlTeamId === null) {
    notFound();
  }

  const pageParams = await searchParams;
  const requestedView = parseTeamView(firstValue(pageParams.view));
  const [seasons, teamSeasonIds, scheduleSeasonIds] = await Promise.all([
    requestedView === "schedule"
      ? listCachedScheduleSeasons()
      : listCachedSeasons(),
    listCachedTeamSeasonIds(nhlTeamId),
    requestedView === "schedule"
      ? listCachedTeamScheduleSeasonIds(nhlTeamId)
      : Promise.resolve([]),
  ]);
  const teamSeasonIdSet = new Set([
    ...teamSeasonIds,
    ...(requestedView === "schedule" ? scheduleSeasonIds : []),
  ]);
  const availableSeasons = seasons.filter((season) =>
    teamSeasonIdSet.has(season.id),
  );
  const chartParams = {
    chartWindow: firstValue(pageParams.chartWindow),
    chartVenue: firstValue(pageParams.chartVenue),
    showGoals: firstValue(pageParams.showGoals),
    showExpectedGoals: firstValue(pageParams.showExpectedGoals),
  };
  const requestedSeason = firstValue(pageParams.season);
  const phase = parseSeasonPhase(firstValue(pageParams.phase));
  const scheduleFilter = parseTeamScheduleFilter(
    firstValue(pageParams.scheduleState),
  );
  const scheduleStrengthMetric = parseScheduleStrengthMetric(
    firstValue(pageParams.sos),
  );
  const gameType = gameTypeForPhase(phase);
  const parsedSeason = parseSeasonId(requestedSeason);
  const selectedSeason =
    availableSeasons.find((season) => season.id === parsedSeason) ??
    availableSeasons[0];

  if (!selectedSeason) {
    notFound();
  }

  const view = normalizeTeamView(requestedView, selectedSeason.id, phase);

  const [
    detail,
    advanced,
    units,
    scheduleGames,
    scheduleTeam,
    gameLog,
    scheduleStrength,
    overviewPeers,
  ] = await Promise.all([
    view === "skaters" || view === "goalies"
      ? getCachedTeamSeasonDetail(nhlTeamId, selectedSeason.id, gameType)
      : getCachedTeamSeasonProfile(nhlTeamId, selectedSeason.id),
    view === "advanced"
      ? getMoneyPuckTeamSeason(nhlTeamId, selectedSeason.id, gameType)
      : Promise.resolve(null),
    view === "combinations"
      ? getMoneyPuckSeasonUnitLeaders(selectedSeason.id, {
          teamNhlId: nhlTeamId,
          minimumIceTimeSeconds: 3_000,
          limit: 100,
        })
      : Promise.resolve(null),
    view === "schedule"
      ? getTeamSchedule(nhlTeamId, selectedSeason.id, gameType)
      : Promise.resolve([]),
    view === "schedule"
      ? getCachedTeamIdentityForSeason(nhlTeamId, selectedSeason.id)
      : Promise.resolve(null),
    view === "trends" || view === "overview"
      ? getCachedTeamGameLog(nhlTeamId, selectedSeason.id)
      : Promise.resolve(null),
    view === "strength" && phase === "regular"
      ? getCachedTeamScheduleStrength(nhlTeamId, selectedSeason.id)
      : Promise.resolve(null),
    view === "overview"
      ? listCachedTeamsBySeason(selectedSeason.id, gameType)
      : Promise.resolve([]),
  ]);
  const profileDetail =
    detail ??
    (scheduleTeam
      ? {
          team: scheduleTeam,
          seasonId: selectedSeason.id,
          regularSeason: null,
          playoffs: null,
          skaters: [],
          goalies: [],
        }
      : null);
  if (!profileDetail) {
    notFound();
  }
  const viewTabs = teamViewTabs({
    nhlTeamId: profileDetail.team.nhlTeamId,
    seasonId: selectedSeason.id,
    phase,
    scheduleStrengthMetric,
    chartParams,
  });
  const overviewStats =
    phase === "playoffs" ? profileDetail.playoffs : profileDetail.regularSeason;
  const overviewIdentity =
    view === "overview" && overviewStats
      ? buildTeamSeasonIdentity({
          stats: overviewStats,
          peers: overviewPeers,
          games: gameLog?.games ?? [],
        })
      : null;

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

function teamViewTabs({
  nhlTeamId,
  seasonId,
  phase,
  scheduleStrengthMetric,
  chartParams,
}: {
  nhlTeamId: number;
  seasonId: number;
  phase: "regular" | "playoffs";
  scheduleStrengthMetric: string;
  chartParams: Record<string, string | undefined>;
}): ViewTab<TeamView>[] {
  const tabs: Array<{ id: TeamView; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "schedule", label: "Schedule" },
    { id: "strength", label: "Strength" },
    { id: "trends", label: "Recent Form" },
    { id: "skaters", label: "Skaters" },
    { id: "goalies", label: "Goalies" },
    { id: "advanced", label: "Shot Quality" },
    { id: "combinations", label: "Lines & Pairings" },
  ];

  return tabs
    .filter(
      (tab) =>
        (tab.id !== "strength" || phase === "regular") &&
        (tab.id !== "combinations" ||
          (seasonId >= 20082009 && phase === "regular")),
    )
    .map((tab) => {
      const params = new URLSearchParams({
        season: String(seasonId),
        phase,
        view: tab.id,
      });
      if (tab.id === "strength") {
        params.set("sos", scheduleStrengthMetric);
      }
      if (tab.id === "trends") {
        Object.entries(chartParams).forEach(([key, value]) => {
          if (value) params.set(key, value);
        });
      }
      return {
        ...tab,
        href: `/teams/${nhlTeamId}?${params.toString()}`,
        prefetch: tab.id === "strength" ? true : undefined,
        preservedSearchParameters: tab.id === "strength" ? ["sos"] : undefined,
      };
    });
}

function parseTeamView(value: string | undefined): TeamView {
  const views: TeamView[] = [
    "overview",
    "schedule",
    "strength",
    "trends",
    "skaters",
    "goalies",
    "advanced",
    "combinations",
  ];
  return views.includes(value as TeamView) ? (value as TeamView) : "overview";
}

function parseTeamScheduleFilter(value: string | undefined): TeamScheduleFilter {
  return value === "completed" || value === "upcoming" ? value : "all";
}

function normalizeTeamView(
  view: TeamView,
  seasonId: number,
  phase: "regular" | "playoffs",
): TeamView {
  if (view === "strength" && phase !== "regular") return "overview";
  if (
    view === "combinations" &&
    (phase !== "regular" || seasonId < 20082009)
  ) {
    return "overview";
  }
  return view;
}

function NumericCell({
  value,
  highlight = false,
}: {
  value: number | string | null;
  highlight?: boolean;
}) {
  return (
    <td
      className={`workspace-semantic-number px-3 py-3 text-center tabular-nums ${
        highlight ? "font-semibold text-[var(--accent)]" : "text-[var(--foreground-soft)]"
      }`}
    >
      {value ?? "—"}
    </td>
  );
}

function formatSigned(value: number | null): string | null {
  return value === null ? null : value > 0 ? `+${value}` : String(value);
}

function formatDecimal(value: number | null, digits: number): string | null {
  return value === null ? null : value.toFixed(digits);
}

function formatSavePercentage(value: number | null): string | null {
  return value === null ? null : value.toFixed(3).replace(/^0/, "");
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
