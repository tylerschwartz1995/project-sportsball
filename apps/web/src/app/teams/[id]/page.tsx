import Link from "next/link";
import { notFound } from "next/navigation";

import { TeamAdvancedAnalytics } from "@/app/_components/advanced-analytics";
import { SeasonPicker } from "@/app/_components/season-picker";
import { SeasonUnitTables } from "@/app/_components/season-unit-tables";
import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import {
  DataTableShell,
  MetricTile,
  SectionHeader,
} from "@/app/_components/ui-primitives";
import { parseNhlId } from "@/contracts/entity";
import { parseSeasonId } from "@/contracts/season";
import type { TeamSeasonStats } from "@/contracts/team";
import { getMoneyPuckTeamSeason } from "@/data/advanced";
import { listSeasons } from "@/data/seasons";
import { getMoneyPuckSeasonUnitLeaders } from "@/data/season-units";
import { getTeamSeasonDetail, listTeamSeasonIds } from "@/data/teams";

export const dynamic = "force-dynamic";

type TeamPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string | string[] }>;
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
  const requestedSeason = firstValue((await searchParams).season);
  const parsedSeason = parseSeasonId(requestedSeason);
  const selectedSeason =
    availableSeasons.find((season) => season.id === parsedSeason) ??
    availableSeasons[0];

  if (!selectedSeason) {
    notFound();
  }

  const [detail, advanced, units] = await Promise.all([
    getTeamSeasonDetail(nhlTeamId, selectedSeason.id),
    getMoneyPuckTeamSeason(nhlTeamId, selectedSeason.id),
    getMoneyPuckSeasonUnitLeaders(selectedSeason.id, {
      teamNhlId: nhlTeamId,
      minimumIceTimeSeconds: 3_000,
      limit: 100,
    }),
  ]);
  if (!detail) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="teams" />

      <section className="py-8 sm:py-10">
        <Link
          href={`/teams?season=${selectedSeason.id}`}
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
              <div
                aria-hidden="true"
                className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.08] font-mono text-2xl font-semibold text-cyan-100 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]"
              >
                {detail.team.abbreviation}
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-300">
                  Team profile · NHL {detail.team.nhlTeamId}
                </p>
                <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">
                  {detail.team.name}
                </h1>
                <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-400">
                  <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">
                    {selectedSeason.label}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">
                    Regular season + playoffs
                  </span>
                </div>
              </div>
            </div>
            <SeasonPicker
              seasons={availableSeasons}
              selectedSeasonId={selectedSeason.id}
              className="relative !max-w-none border-white/15 bg-slate-950/55"
            />
          </div>
        </div>

        <nav
          aria-label={`${detail.team.name} page sections`}
          className="workspace-scroll-nav"
        >
          <SectionLink href="#overview" label="Overview" />
          <SectionLink href="#skaters" label="Skaters" />
          <SectionLink href="#goalies" label="Goalies" />
          <SectionLink href="#advanced" label="Advanced" />
          {selectedSeason.id >= 20082009 ? (
            <SectionLink href="#combinations" label="Combinations" />
          ) : null}
        </nav>

        <div id="overview" className="mt-8 grid scroll-mt-6 gap-5 lg:grid-cols-2">
          <SeasonPanel title="Regular season" stats={detail.regularSeason} />
          <SeasonPanel title="Playoffs" stats={detail.playoffs} />
        </div>

        <Link
          href={`/teams/${detail.team.nhlTeamId}/games?season=${selectedSeason.id}`}
          className="group mt-5 flex items-center justify-between gap-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.055] px-5 py-4 transition hover:border-cyan-300/40 hover:bg-cyan-300/[0.085]"
        >
          <span>
            <span className="block font-medium text-white">
              Explore the {selectedSeason.label} game log
            </span>
            <span className="mt-1 block text-sm text-slate-400">
              Results, recent form, shot totals, and five-on-five expected goals.
            </span>
          </span>
          <span className="shrink-0 text-cyan-300 transition group-hover:translate-x-0.5">
            View games →
          </span>
        </Link>

        <section id="skaters" className="mt-12 scroll-mt-6">
          <SectionHeader
            eyebrow="Official NHL splits"
            title="Skaters"
            description="Traditional regular-season production for every player who appeared with this team."
            action={
              <p className="text-sm tabular-nums text-slate-500">
                {detail.skaters.length} player-team rows
              </p>
            }
          />
          <DataTableShell>
            <SortableTable defaultSortKey="points">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
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
                          <Link
                            href={`/players/${player.nhlPlayerId}?season=${selectedSeason.id}`}
                            className="font-medium text-white transition hover:text-cyan-200"
                          >
                            {player.name}
                          </Link>
                          <span className="ml-2 text-xs text-slate-500">
                            {player.position}
                          </span>
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

        <section id="goalies" className="mt-12 scroll-mt-6">
          <SectionHeader
            eyebrow="Official NHL splits"
            title="Goalies"
            description="Traditional regular-season appearances, decisions, and save results."
            action={
              <p className="text-sm tabular-nums text-slate-500">
                {detail.goalies.length} player-team rows
              </p>
            }
          />
          <DataTableShell>
            <SortableTable defaultSortKey="savePercentage">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
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
                          <Link
                            href={`/players/${player.nhlPlayerId}?season=${selectedSeason.id}`}
                            className="font-medium text-white transition hover:text-cyan-200"
                          >
                            {player.name}
                          </Link>
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

        <div id="advanced" className="scroll-mt-6">
          <TeamAdvancedAnalytics
            data={advanced}
            seasonId={selectedSeason.id}
          />
        </div>

        {selectedSeason.id >= 20082009 ? (
          <section id="combinations" className="mt-12 scroll-mt-6">
            <SectionHeader
              eyebrow="Five-on-five combinations"
              title="Season lines and pairings"
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
                data={units}
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

function SeasonPanel({
  title,
  stats,
}: {
  title: string;
  stats: TeamSeasonStats | null;
}) {
  if (!stats) {
    return (
      <article className="surface-panel p-6">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-4 text-sm text-slate-500">Did not participate.</p>
      </article>
    );
  }

  const overtimeLosses = stats.overtimeLosses + stats.shootoutLosses;
  const goalDifferential = stats.goalsFor - stats.goalsAgainst;
  const shotDifferential = stats.shotsFor - stats.shotsAgainst;
  const isPlayoffs = stats.gameType === 3;

  return (
    <article className="surface-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">
            {stats.wins}–{stats.regulationLosses}–{overtimeLosses}
          </p>
        </div>
        <p className="text-sm tabular-nums text-slate-400">
          {stats.gamesPlayed} games
        </p>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricTile
          label={isPlayoffs ? "Win rate" : "Points"}
          value={
            isPlayoffs
              ? stats.gamesPlayed > 0
                ? `${((stats.wins / stats.gamesPlayed) * 100).toFixed(1)}%`
                : "—"
              : stats.standingsPoints
          }
          emphasis
        />
        <MetricTile
          label="Goal diff."
          value={formatSignedNumber(goalDifferential)}
          detail={`${stats.goalsFor} for · ${stats.goalsAgainst} against`}
        />
        <MetricTile
          label="Shot diff."
          value={formatSignedNumber(shotDifferential)}
          detail={`${stats.shotsFor} for · ${stats.shotsAgainst} against`}
        />
        <MetricTile
          label="Win types"
          value={
            isPlayoffs
              ? `${stats.regulationWins} · ${stats.overtimeWins}`
              : `${stats.regulationWins} · ${stats.overtimeWins} · ${stats.shootoutWins}`
          }
          detail={isPlayoffs ? "REG · OT" : "REG · OT · SO"}
        />
      </dl>
    </article>
  );
}

function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
    >
      {label}
    </a>
  );
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
      className={`px-3 py-3 text-right tabular-nums ${
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

function formatSignedNumber(value: number): string {
  return value > 0 ? `+${value}` : String(value);
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
