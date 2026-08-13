import Link from "next/link";
import { notFound } from "next/navigation";

import { TeamAdvancedAnalytics } from "@/app/_components/advanced-analytics";
import { SeasonPicker } from "@/app/_components/season-picker";
import { SeasonPhaseFilter } from "@/app/_components/season-phase-filter";
import { ScheduleStrength } from "@/app/_components/schedule-strength";
import { SeasonUnitTables } from "@/app/_components/season-unit-tables";
import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { TeamLogo } from "@/app/_components/team-logo";
import { TeamGameRecord } from "@/app/_components/team-game-record";
import { TeamSeasonIdentity } from "@/app/_components/team-season-identity";
import { TeamRollingPerformanceChart } from "@/app/_components/team-rolling-performance-chart";
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
import type { GameSummary } from "@/contracts/game";
import { getMoneyPuckTeamSeason } from "@/data/advanced";
import { getTeamGameLog } from "@/data/game-logs";
import { getUpcomingGamesForTeamAcrossSeasons } from "@/data/games";
import { listSeasons } from "@/data/seasons";
import { getTeamScheduleStrength } from "@/data/schedule-strength";
import { getMoneyPuckSeasonUnitLeaders } from "@/data/season-units";
import {
  getTeamSeasonDetail,
  listTeamsBySeason,
  listTeamSeasonIds,
} from "@/data/teams";
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

  const [seasons, teamSeasonIds] = await Promise.all([
    listSeasons(),
    listTeamSeasonIds(nhlTeamId),
  ]);
  const teamSeasonIdSet = new Set(teamSeasonIds);
  const availableSeasons = seasons.filter((season) =>
    teamSeasonIdSet.has(season.id),
  );
  const pageParams = await searchParams;
  const chartParams = {
    chartWindow: firstValue(pageParams.chartWindow),
    chartVenue: firstValue(pageParams.chartVenue),
    showGoals: firstValue(pageParams.showGoals),
    showExpectedGoals: firstValue(pageParams.showExpectedGoals),
  };
  const requestedSeason = firstValue(pageParams.season);
  const phase = parseSeasonPhase(firstValue(pageParams.phase));
  const requestedView = parseTeamView(firstValue(pageParams.view));
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
    upcomingGames,
    gameLog,
    scheduleStrength,
    overviewPeers,
  ] = await Promise.all([
      getTeamSeasonDetail(nhlTeamId, selectedSeason.id, gameType),
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
        ? getUpcomingGamesForTeamAcrossSeasons(nhlTeamId)
        : Promise.resolve([]),
      view === "trends" || view === "overview"
        ? getTeamGameLog(nhlTeamId, selectedSeason.id)
        : Promise.resolve(null),
      view === "strength" && phase === "regular"
        ? getTeamScheduleStrength(nhlTeamId, selectedSeason.id)
        : Promise.resolve(null),
      view === "overview"
        ? listTeamsBySeason(selectedSeason.id, gameType)
        : Promise.resolve([]),
    ]);
  if (!detail) {
    notFound();
  }
  const viewTabs = teamViewTabs({
    nhlTeamId: detail.team.nhlTeamId,
    seasonId: selectedSeason.id,
    phase,
    scheduleStrengthMetric,
    chartParams,
  });
  const overviewStats =
    phase === "playoffs" ? detail.playoffs : detail.regularSeason;
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
        <Link
          href={`/teams?season=${selectedSeason.id}&phase=${phase}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-cyan-200"
        >
          <span aria-hidden="true">←</span> All teams
        </Link>

        <div className="surface-panel relative mt-6 overflow-hidden p-6 sm:p-8">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-10 -right-3 font-mono text-[9rem] font-semibold leading-none tracking-[-0.09em] text-white/[0.025] sm:text-[13rem]"
          >
            {detail.team.abbreviation}
          </span>
          <div className="relative grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-end">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <TeamLogo
                name={detail.team.name}
                abbreviation={detail.team.abbreviation}
                nhlTeamId={detail.team.nhlTeamId}
              />
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-300">
                  Team profile
                </p>
                <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">
                  {detail.team.name}
                </h1>
                <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-400">
                  <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">
                    {selectedSeason.label}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">
                    {seasonPhaseLabel(phase)}
                  </span>
                  <Link
                    href={`/drafts?view=board&year=all&team=${detail.team.abbreviation}`}
                    className="rounded-full border border-cyan-300/25 bg-cyan-300/[0.06] px-3 py-1 font-medium text-cyan-200 transition hover:border-cyan-300/45 hover:text-cyan-100"
                  >
                    Draft history →
                  </Link>
                </div>
              </div>
            </div>
            <SeasonPicker
              seasons={availableSeasons}
              selectedSeasonId={selectedSeason.id}
              params={{ phase, sos: scheduleStrengthMetric, view, ...chartParams }}
              className="relative !max-w-none border-white/15 bg-slate-950/55"
            />
          </div>
        </div>

        <ViewTabs
          active={view}
          ariaLabel={`${detail.team.name} views`}
          label="Profile view"
          tabs={viewTabs}
        />

        <SeasonPhaseFilter
          active={phase}
          path={`/teams/${detail.team.nhlTeamId}`}
          params={{
            season: selectedSeason.id,
            sos: scheduleStrengthMetric,
            view,
            ...chartParams,
          }}
        />

        {view === "overview" ? (
          overviewIdentity && overviewStats ? (
            <TeamSeasonIdentity
              identity={overviewIdentity}
              seasonId={selectedSeason.id}
              phase={phase}
              phaseLabel={seasonPhaseLabel(phase)}
            />
          ) : (
            <div className="workspace-empty-state mt-8">
              This team did not participate in the selected phase.
            </div>
          )
        ) : null}

        {view === "schedule" ? (
          <>
            <UpcomingSchedule
              games={upcomingGames}
              teamNhlId={detail.team.nhlTeamId}
            />
            <Link
              href={`/teams/${detail.team.nhlTeamId}/games?season=${selectedSeason.id}&phase=${phase}`}
              className="workspace-width-compact group mt-5 flex items-center justify-between gap-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.055] px-5 py-4 transition hover:border-cyan-300/40 hover:bg-cyan-300/[0.085]"
            >
              <span>
                <span className="block font-medium text-white">
                  Explore the {selectedSeason.label} game log
                </span>
                <span className="mt-1 block text-sm text-slate-400">
                  Results, recent form, shot totals, and five-on-five expected
                  goals.
                </span>
              </span>
              <span className="shrink-0 text-cyan-300 transition group-hover:translate-x-0.5">
                View games →
              </span>
            </Link>
          </>
        ) : null}

        {view === "strength" && scheduleStrength ? (
          <ScheduleStrength
            data={scheduleStrength}
            metric={scheduleStrengthMetric}
            phase={phase}
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
                    fiveOnFiveXGoalsAgainst:
                      game.fiveOnFiveXGoalsAgainst,
                  })) ?? []
              }
              teamName={detail.team.name}
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
              <p className="text-sm tabular-nums text-slate-500">
                {detail.skaters.length} player-team rows
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
                    <tr className="border-b border-white/10 bg-white/[0.035] text-left text-xs uppercase tracking-[0.12em] text-slate-400">
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
                    {detail.skaters.map((player) => (
                      <tr
                        key={`${player.nhlPlayerId}-${player.gamesPlayed}`}
                        className="border-b border-white/[0.06] text-slate-300 last:border-0 hover:bg-white/[0.035]"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <Link
                              href={`/players/${player.nhlPlayerId}?season=${selectedSeason.id}`}
                              className="workspace-entity-name font-medium text-white transition hover:text-cyan-200"
                            >
                              {player.name}
                            </Link>
                            <span className="ml-2 text-xs text-slate-500">
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
              <p className="text-sm tabular-nums text-slate-500">
                {detail.goalies.length} player-team rows
              </p>
            }
          />
          <DataTableShell>
            <SortableTable defaultSortKey="savePercentage">
              <div className="overflow-x-auto">
                <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[760px]">
                  <colgroup>
                    <col className="workspace-col-entity" />
                    <col className="workspace-col-number" span={6} />
                    <col className="workspace-col-percentage" />
                    <col className="workspace-col-number" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.035] text-left text-xs uppercase tracking-[0.12em] text-slate-400">
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
                    {detail.goalies.map((player) => (
                      <tr
                        key={`${player.nhlPlayerId}-${player.gamesPlayed}`}
                        className="border-b border-white/[0.06] text-slate-300 last:border-0 hover:bg-white/[0.035]"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <Link
                              href={`/players/${player.nhlPlayerId}?season=${selectedSeason.id}`}
                              className="workspace-entity-name font-medium text-white transition hover:text-cyan-200"
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
                  className="text-sm font-medium text-violet-300 transition hover:text-violet-200"
                >
                  View league rankings →
                </Link>
              }
            />
            <div className="mt-6">
              <SeasonUnitTables
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

function UpcomingSchedule({
  games,
  teamNhlId,
}: {
  games: GameSummary[];
  teamNhlId: number;
}) {
  const firstGame = games[0];
  return (
    <section
      id="schedule"
      className="workspace-width-compact mt-8 scroll-mt-6"
    >
      <SectionHeader
        eyebrow="Schedule"
        title="Upcoming Games"
        description={
          games.length > 0
            ? `Next ${games.length} scheduled games across the current and upcoming season.`
            : "No upcoming games are currently stored."
        }
      />
      {games.length > 0 ? (
        <SortableTable defaultSortKey="date" defaultDirection="asc">
          <div className="data-table-shell workspace-table-scroll mt-5">
            <table className="workspace-table workspace-table-dense workspace-table-schedule workspace-table-semantic">
              <colgroup>
                <col className="workspace-col-date" />
                <col />
                <col className="workspace-col-season" />
              </colgroup>
              <thead>
                <tr>
                  <SortableHeader label="Date" sortKey="date" align="left" defaultDirection="asc" />
                  <SortableHeader label="Matchup" sortKey="matchup" align="left" defaultDirection="asc" />
                  <SortableHeader label="Season" sortKey="season" align="left" />
                </tr>
              </thead>
              <tbody>{games.map((game) => {
                const isHome = game.homeTeam.nhlTeamId === teamNhlId;
                const opponent = isHome ? game.awayTeam : game.homeTeam;
                return <tr key={game.nhlGameId}>
                  <td data-sort-value={game.startTimeUtc}><Link href={`/games/${game.nhlGameId}`}>{formatScheduleDate(game.startTimeUtc)}</Link></td>
                  <td data-sort-value={opponent.name}>
                    <span className="inline-flex items-center gap-2">
                      <TeamLogo {...opponent} size="tiny" decorative />
                      <span>{isHome ? "vs" : "at"}</span>
                      <Link href={`/teams/${opponent.nhlTeamId}?season=${game.seasonId}`}>{opponent.name}</Link>
                      <TeamGameRecord record={opponent.record} />
                    </span>
                  </td>
                  <td data-sort-value={game.seasonId}>{formatSeasonId(game.seasonId)}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        </SortableTable>
      ) : null}
      <Link
        href={firstGame ? `/games?season=${firstGame.seasonId}&date=${firstGame.gameDate}&phase=${firstGame.gameType === 3 ? "playoffs" : "regular"}` : "/games"}
        className="mt-4 inline-flex text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
      >
        Browse the full league schedule →
      </Link>
    </section>
  );
}

function formatSeasonId(seasonId: number) {
  const start = Math.floor(seasonId / 10_000);
  const end = seasonId % 10_000;
  return `${start}\u2013${String(end).slice(2)}`;
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
    { id: "trends", label: "Trends" },
    { id: "skaters", label: "Skaters" },
    { id: "goalies", label: "Goalies" },
    { id: "advanced", label: "Advanced" },
    { id: "combinations", label: "Combinations" },
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
        highlight ? "font-semibold text-cyan-200" : "text-slate-300"
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

function formatScheduleDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Vancouver",
    timeZoneName: "short",
  }).format(new Date(value));
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
