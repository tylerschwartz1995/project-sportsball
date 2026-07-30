import Link from "next/link";
import { notFound } from "next/navigation";

import { TeamAdvancedAnalytics } from "@/app/_components/advanced-analytics";
import { SeasonPicker } from "@/app/_components/season-picker";
import { SiteHeader } from "@/app/_components/site-header";
import { parseNhlId } from "@/contracts/entity";
import { parseSeasonId } from "@/contracts/season";
import type { TeamSeasonStats } from "@/contracts/team";
import { getMoneyPuckTeamSeason } from "@/data/advanced";
import { listSeasons } from "@/data/seasons";
import { getTeamSeasonDetail } from "@/data/teams";

export const dynamic = "force-dynamic";

type TeamPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string | string[] }>;
};

export default async function TeamPage({
  params,
  searchParams,
}: TeamPageProps) {
  const seasons = await listSeasons();
  const nhlTeamId = parseNhlId((await params).id);
  const requestedSeason = firstValue((await searchParams).season);
  const parsedSeason = parseSeasonId(requestedSeason);
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];

  if (nhlTeamId === null || !selectedSeason) {
    notFound();
  }

  const [detail, advanced] = await Promise.all([
    getTeamSeasonDetail(nhlTeamId, selectedSeason.id),
    getMoneyPuckTeamSeason(nhlTeamId, selectedSeason.id),
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
            seasons={seasons}
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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.035] text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                    <th className="px-4 py-3 font-medium">Player</th>
                    <th className="px-3 py-3 text-right font-medium">GP</th>
                    <th className="px-3 py-3 text-right font-medium">G</th>
                    <th className="px-3 py-3 text-right font-medium">A</th>
                    <th className="px-3 py-3 text-right font-medium">PTS</th>
                    <th className="px-3 py-3 text-right font-medium">+/-</th>
                    <th className="px-4 py-3 text-right font-medium">PIM</th>
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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.035] text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                    <th className="px-4 py-3 font-medium">Goalie</th>
                    <th className="px-3 py-3 text-right font-medium">GP</th>
                    <th className="px-3 py-3 text-right font-medium">GS</th>
                    <th className="px-3 py-3 text-right font-medium">W</th>
                    <th className="px-3 py-3 text-right font-medium">L</th>
                    <th className="px-3 py-3 text-right font-medium">OTL</th>
                    <th className="px-3 py-3 text-right font-medium">GAA</th>
                    <th className="px-3 py-3 text-right font-medium">SV%</th>
                    <th className="px-4 py-3 text-right font-medium">SO</th>
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
