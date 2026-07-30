import Link from "next/link";

import { SeasonPicker } from "@/app/_components/season-picker";
import { SiteHeader } from "@/app/_components/site-header";
import { parseSeasonId } from "@/contracts/season";
import type { GameSummary } from "@/contracts/game";
import type { StandingsEntry } from "@/contracts/standings";
import { getLatestGamesForSeason } from "@/data/games";
import { listPlayersBySeason } from "@/data/players";
import { listSeasons } from "@/data/seasons";
import { getStandings } from "@/data/standings";
import { firstQueryValue } from "@/lib/directory";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{
    season?: string | string[];
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const seasons = await listSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];

  const [standings, players, latestGames] = selectedSeason
    ? await Promise.all([
        getStandings(selectedSeason.id),
        listPlayersBySeason(selectedSeason.id),
        getLatestGamesForSeason(selectedSeason.id),
      ])
    : [[], { seasonId: 0, skaters: [], goalies: [] }, []];
  const latestDate = latestGames[0]?.gameDate;
  const pointsLeader = players.skaters[0];
  const goalsLeader = players.skaters.reduce(
    (best, player) =>
      !best || player.goals > best.goals ? player : best,
    pointsLeader,
  );
  const leagueLeader = standings[0];

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="home" />

      <section className="py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.18em] text-cyan-300">
              League dashboard
            </p>
            <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
              {selectedSeason
                ? `${selectedSeason.label} NHL overview`
                : "NHL data unavailable"}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
              One starting point for results, the playoff picture, scoring
              leaders, and deeper team and player analysis.
            </p>
          </div>
          <SeasonPicker
            seasons={seasons}
            selectedSeasonId={selectedSeason?.id}
          />
        </div>

        {selectedSeason && leagueLeader && pointsLeader && goalsLeader ? (
          <>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <LeaderCard
                eyebrow="League leader"
                value={leagueLeader.teamName}
                detail={`${leagueLeader.points} points · ${formatRecord(leagueLeader)}`}
                href={`/teams/${leagueLeader.nhlTeamId}?season=${selectedSeason.id}`}
              />
              <LeaderCard
                eyebrow="Points leader"
                value={pointsLeader.name}
                detail={`${pointsLeader.points} points · ${pointsLeader.goals} goals`}
                href={`/players/${pointsLeader.nhlPlayerId}?season=${selectedSeason.id}`}
              />
              <LeaderCard
                eyebrow="Goals leader"
                value={goalsLeader.name}
                detail={`${goalsLeader.goals} goals in ${goalsLeader.gamesPlayed} games`}
                href={`/players/${goalsLeader.nhlPlayerId}?season=${selectedSeason.id}`}
              />
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <DashboardSection
                title={latestDate ? `Results · ${formatDate(latestDate)}` : "Results"}
                description="The most recent game date stored for this season."
                href={
                  latestDate
                    ? `/games?season=${selectedSeason.id}&date=${latestDate}`
                    : `/games?season=${selectedSeason.id}`
                }
                linkLabel="All games"
              >
                {latestGames.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    {latestGames.slice(0, 4).map((game) => (
                      <GameResult key={game.id} game={game} />
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No games are available for this season." />
                )}
              </DashboardSection>

              <DashboardSection
                title="Standings snapshot"
                description="The top five teams in the latest NHL standings."
                href={`/standings?season=${selectedSeason.id}`}
                linkLabel="Full standings"
              >
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
                  {standings.slice(0, 5).map((team) => (
                    <Link
                      key={team.teamId}
                      href={`/teams/${team.nhlTeamId}?season=${selectedSeason.id}`}
                      className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 border-b border-white/[0.06] px-4 py-3 text-sm transition last:border-0 hover:bg-white/[0.035]"
                    >
                      <span className="font-mono text-slate-600">
                        {team.leagueRank}
                      </span>
                      <span>
                        <span className="block font-medium text-white">
                          {team.teamName}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {formatRecord(team)}
                        </span>
                      </span>
                      <span className="font-semibold tabular-nums text-cyan-200">
                        {team.points} PTS
                      </span>
                    </Link>
                  ))}
                </div>
              </DashboardSection>
            </div>

            <DashboardSection
              className="mt-12"
              title="Scoring leaders"
              description="The five highest-scoring skaters in the selected regular season."
              href={`/players?season=${selectedSeason.id}`}
              linkLabel="All players"
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {players.skaters.slice(0, 5).map((player, index) => (
                  <Link
                    key={player.nhlPlayerId}
                    href={`/players/${player.nhlPlayerId}?season=${selectedSeason.id}`}
                    className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-cyan-300/30 hover:bg-white/[0.055]"
                  >
                    <p className="font-mono text-xs text-slate-600">
                      #{index + 1}
                    </p>
                    <p className="mt-3 font-semibold text-white">
                      {player.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {player.position ?? "Skater"} · {player.gamesPlayed} GP
                    </p>
                    <p className="mt-5 text-2xl font-semibold tabular-nums text-cyan-200">
                      {player.points}
                    </p>
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-600">
                      points
                    </p>
                  </Link>
                ))}
              </div>
            </DashboardSection>
          </>
        ) : (
          <EmptyState message="The selected season does not have a complete dashboard yet." />
        )}
      </section>
    </main>
  );
}

function LeaderCard({
  eyebrow,
  value,
  detail,
  href,
}: {
  eyebrow: string;
  value: string;
  detail: string;
  href: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
        {eyebrow}
      </p>
      <Link
        href={href}
        className="mt-3 block text-xl font-semibold text-white transition hover:text-cyan-200"
      >
        {value}
      </Link>
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
    </article>
  );
}

function DashboardSection({
  title,
  description,
  href,
  linkLabel,
  className = "",
  children,
}: {
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={className}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-2xl font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>
        <Link
          href={href}
          className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
        >
          {linkLabel} →
        </Link>
      </div>
      {children}
    </section>
  );
}

function GameResult({ game }: { game: GameSummary }) {
  return (
    <Link
      href={`/games/${game.nhlGameId}`}
      className="block rounded-2xl border border-white/10 bg-slate-950/50 p-4 transition hover:border-cyan-300/25 hover:bg-slate-950/80"
    >
      <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.12em] text-slate-600">
        <span>{game.gameType === 3 ? "Playoffs" : "Regular season"}</span>
        <span>{finalLabel(game.lastPeriodType)}</span>
      </div>
      <ScoreLine team={game.awayTeam} />
      <ScoreLine team={game.homeTeam} />
    </Link>
  );
}

function ScoreLine({ team }: { team: GameSummary["awayTeam"] }) {
  return (
    <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 py-1.5">
      <span className="font-mono text-sm font-semibold text-cyan-200">
        {team.abbreviation}
      </span>
      <span className="truncate text-sm text-slate-300">{team.name}</span>
      <span className="text-xl font-semibold tabular-nums text-white">
        {team.score ?? "—"}
      </span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-6 text-amber-100">
      {message}
    </div>
  );
}

function formatRecord(team: StandingsEntry): string {
  return `${team.wins}-${team.losses}-${team.overtimeLosses}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function finalLabel(lastPeriodType: string | null): string {
  return lastPeriodType && lastPeriodType !== "REG"
    ? `Final · ${lastPeriodType}`
    : "Final";
}
