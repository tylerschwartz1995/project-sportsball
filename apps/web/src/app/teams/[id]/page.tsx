import Link from "next/link";
import { notFound } from "next/navigation";

import { TeamAdvancedAnalytics } from "@/app/_components/advanced-analytics";
import { SeasonPicker } from "@/app/_components/season-picker";
import { SeasonUnitTables } from "@/app/_components/season-unit-tables";
import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
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

      <section className="py-10">
        <Link
          href={`/teams?season=${selectedSeason.id}`}
          className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
        >
          ← All teams
        </Link>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.18em] text-cyan-300">
              {detail.team.abbreviation} · NHL team {detail.team.nhlTeamId}
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
              {detail.team.name}
            </h2>
            <p className="mt-4 text-base text-slate-400">
              {selectedSeason.label} regular season and playoffs
            </p>
          </div>
          <SeasonPicker
            seasons={availableSeasons}
            selectedSeasonId={selectedSeason.id}
          />
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <SeasonPanel title="Regular season" stats={detail.regularSeason} />
          <SeasonPanel title="Playoffs" stats={detail.playoffs} />
        </div>

        <TeamAdvancedAnalytics
          data={advanced}
          seasonId={selectedSeason.id}
        />

        {selectedSeason.id >= 20082009 ? (
          <section className="mt-12">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-300">
                  Five-on-five combinations
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  Season lines and pairings
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Combinations with at least 50 minutes together.
                </p>
              </div>
              <Link
                href={`/lines?season=${selectedSeason.id}&minimum=100`}
                className="text-sm font-medium text-violet-300 transition hover:text-violet-200"
              >
                View league rankings →
              </Link>
            </div>
            <div className="mt-6">
              <SeasonUnitTables
                data={units}
                seasonId={selectedSeason.id}
                showTeam={false}
              />
            </div>
          </section>
        ) : null}

        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-300">
                Official NHL splits
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-white">
                Skaters
              </h3>
            </div>
            <p className="text-sm text-slate-500">
              {detail.skaters.length} player-team rows
            </p>
          </div>
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
            <SortableTable defaultSortKey="points">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.035] text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                    <SortableHeader label="Player" sortKey="player" align="left" defaultDirection="asc" />
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
          </div>
        </section>

        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h3 className="text-2xl font-semibold text-white">Goalies</h3>
            <p className="text-sm text-slate-500">
              {detail.goalies.length} player-team rows
            </p>
          </div>
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
            <SortableTable defaultSortKey="savePercentage">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.035] text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                    <SortableHeader label="Goalie" sortKey="goalie" align="left" defaultDirection="asc" />
                    <SortableHeader label="GP" sortKey="games" />
                    <SortableHeader label="GS" sortKey="starts" />
                    <SortableHeader label="W" sortKey="wins" />
                    <SortableHeader label="L" sortKey="losses" />
                    <SortableHeader label="OTL" sortKey="overtimeLosses" />
                    <SortableHeader label="GAA" sortKey="goalsAgainstAverage" defaultDirection="asc" />
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
          </div>
        </section>
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
      <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-4 text-sm text-slate-500">Did not participate.</p>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <span className="font-mono text-sm text-cyan-200">
          {stats.wins}–{stats.losses}
        </span>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Games" value={stats.gamesPlayed} />
        <Stat label="Points" value={stats.standingsPoints} />
        <Stat label="Goals" value={`${stats.goalsFor}–${stats.goalsAgainst}`} />
        <Stat label="Shots" value={`${stats.shotsFor}–${stats.shotsAgainst}`} />
        <Stat label="Reg wins" value={stats.regulationWins} />
        <Stat label="OT wins" value={stats.overtimeWins} />
        <Stat label="SO wins" value={stats.shootoutWins} />
        <Stat
          label="OT/SO losses"
          value={stats.overtimeLosses + stats.shootoutLosses}
        />
      </dl>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.12em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 font-semibold tabular-nums text-white">{value}</dd>
    </div>
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

function formatDecimal(value: number | null, digits: number): string | null {
  return value === null ? null : value.toFixed(digits);
}

function formatSavePercentage(value: number | null): string | null {
  return value === null ? null : value.toFixed(3).replace(/^0/, "");
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
