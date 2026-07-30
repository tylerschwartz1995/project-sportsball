import Link from "next/link";

import { SeasonPicker } from "@/app/_components/season-picker";
import { SiteHeader } from "@/app/_components/site-header";
import { parseSeasonId } from "@/contracts/season";
import { listPlayersBySeason } from "@/data/players";
import { listSeasons } from "@/data/seasons";

export const dynamic = "force-dynamic";

type PlayersPageProps = {
  searchParams: Promise<{ season?: string | string[] }>;
};

export default async function PlayersPage({ searchParams }: PlayersPageProps) {
  const seasons = await listSeasons();
  const parsedSeason = parseSeasonId(
    firstValue((await searchParams).season),
  );
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const players = selectedSeason
    ? await listPlayersBySeason(selectedSeason.id)
    : { seasonId: 0, skaters: [], goalies: [] };
  const pointsLeader = players.skaters[0];
  const goalsLeader = players.skaters.reduce(
    (best, player) => (!best || player.goals > best.goals ? player : best),
    pointsLeader,
  );
  const goalieLeader =
    players.goalies
      .filter((goalie) => goalie.gamesPlayed >= 20)
      .sort(
        (left, right) =>
          (right.savePercentage ?? 0) - (left.savePercentage ?? 0),
      )[0] ?? players.goalies[0];

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="players" />

      <section className="py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.18em] text-cyan-300">
              Player statistics
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
              {selectedSeason?.label ?? "No season"} players
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
              Complete Polars-derived regular-season totals for every
              participating skater and goalie. Traded-player rows combine all
              teams.
            </p>
          </div>
          <SeasonPicker
            seasons={seasons}
            selectedSeasonId={selectedSeason?.id}
          />
        </div>

        {pointsLeader ? (
          <>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <LeaderCard
                label="Points leader"
                playerId={pointsLeader.nhlPlayerId}
                seasonId={selectedSeason?.id}
                name={pointsLeader.name}
                detail={`${pointsLeader.points} points`}
              />
              <LeaderCard
                label="Goals leader"
                playerId={goalsLeader.nhlPlayerId}
                seasonId={selectedSeason?.id}
                name={goalsLeader.name}
                detail={`${goalsLeader.goals} goals`}
              />
              <LeaderCard
                label="Save percentage"
                playerId={goalieLeader.nhlPlayerId}
                seasonId={selectedSeason?.id}
                name={goalieLeader.name}
                detail={`${formatSavePercentage(goalieLeader.savePercentage)} in ${goalieLeader.gamesPlayed} games`}
              />
            </div>

            <PlayerSectionHeader
              title="Skaters"
              count={players.skaters.length}
              description="Combined totals across all teams played for."
            />
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.035] text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                      <th className="px-4 py-3 font-medium">Player</th>
                      <th className="px-3 py-3 text-right font-medium">GP</th>
                      <th className="px-3 py-3 text-right font-medium">G</th>
                      <th className="px-3 py-3 text-right font-medium">A</th>
                      <th className="px-3 py-3 text-right font-medium">PTS</th>
                      <th className="px-3 py-3 text-right font-medium">+/-</th>
                      <th className="px-3 py-3 text-right font-medium">PIM</th>
                      <th className="px-3 py-3 text-right font-medium">S</th>
                      <th className="px-4 py-3 text-right font-medium">Teams</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.skaters.map((player) => (
                      <tr
                        key={player.nhlPlayerId}
                        className="border-b border-white/[0.06] text-slate-300 [contain-intrinsic-size:auto_48px] [content-visibility:auto] last:border-0 hover:bg-white/[0.035]"
                      >
                        <td className="px-4 py-3">
                          <PlayerLink
                            playerId={player.nhlPlayerId}
                            seasonId={selectedSeason?.id}
                            name={player.name}
                          />
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
                        <NumericCell value={player.shotsOnGoal} />
                        <NumericCell value={player.teamsPlayedFor} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <PlayerSectionHeader
              title="Goalies"
              count={players.goalies.length}
              description="Participating goalies only; dressed backups are excluded."
            />
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.035] text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                      <th className="px-4 py-3 font-medium">Goalie</th>
                      <th className="px-3 py-3 text-right font-medium">GP</th>
                      <th className="px-3 py-3 text-right font-medium">GS</th>
                      <th className="px-3 py-3 text-right font-medium">W</th>
                      <th className="px-3 py-3 text-right font-medium">L</th>
                      <th className="px-3 py-3 text-right font-medium">OTL</th>
                      <th className="px-3 py-3 text-right font-medium">GA</th>
                      <th className="px-3 py-3 text-right font-medium">SV</th>
                      <th className="px-4 py-3 text-right font-medium">SV%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.goalies.map((player) => (
                      <tr
                        key={player.nhlPlayerId}
                        className="border-b border-white/[0.06] text-slate-300 [contain-intrinsic-size:auto_48px] [content-visibility:auto] last:border-0 hover:bg-white/[0.035]"
                      >
                        <td className="px-4 py-3">
                          <PlayerLink
                            playerId={player.nhlPlayerId}
                            seasonId={selectedSeason?.id}
                            name={player.name}
                          />
                        </td>
                        <NumericCell value={player.gamesPlayed} />
                        <NumericCell value={player.gamesStarted} />
                        <NumericCell value={player.wins} />
                        <NumericCell value={player.losses} />
                        <NumericCell value={player.overtimeLosses} />
                        <NumericCell value={player.goalsAgainst} />
                        <NumericCell value={player.saves} />
                        <NumericCell
                          value={formatSavePercentage(player.savePercentage)}
                          highlight
                        />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-10 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-6 text-amber-100">
            No player statistics are available for this season.
          </div>
        )}
      </section>
    </main>
  );
}

function LeaderCard({
  label,
  playerId,
  seasonId,
  name,
  detail,
}: {
  label: string;
  playerId: number;
  seasonId: number | undefined;
  name: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-xl font-semibold">
        <PlayerLink playerId={playerId} seasonId={seasonId} name={name} />
      </p>
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
    </article>
  );
}

function PlayerSectionHeader({
  title,
  count,
  description,
}: {
  title: string;
  count: number;
  description: string;
}) {
  return (
    <div className="mt-12 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h3 className="text-2xl font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <p className="text-sm text-slate-500">{count} players</p>
    </div>
  );
}

function PlayerLink({
  playerId,
  seasonId,
  name,
}: {
  playerId: number;
  seasonId: number | undefined;
  name: string;
}) {
  return (
    <Link
      href={`/players/${playerId}${seasonId ? `?season=${seasonId}` : ""}`}
      className="font-medium text-white transition hover:text-cyan-200"
    >
      {name}
    </Link>
  );
}

function NumericCell({
  value,
  highlight = false,
}: {
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <td
      className={`px-3 py-3 text-right tabular-nums ${
        highlight ? "font-semibold text-cyan-200" : "text-slate-300"
      }`}
    >
      {value}
    </td>
  );
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function formatSavePercentage(value: number | null): string {
  return value === null ? "—" : value.toFixed(3).replace(/^0/, "");
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
