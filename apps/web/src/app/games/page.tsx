import Link from "next/link";

import { SiteHeader } from "@/app/_components/site-header";
import { parseGameDate, type GameSummary } from "@/contracts/game";
import { parseSeasonId } from "@/contracts/season";
import { getGamesByDate, listGameDates } from "@/data/games";
import { listSeasons } from "@/data/seasons";

export const dynamic = "force-dynamic";

type GamesPageProps = {
  searchParams: Promise<{
    season?: string | string[];
    date?: string | string[];
  }>;
};

export default async function GamesPage({ searchParams }: GamesPageProps) {
  const seasons = await listSeasons();
  const requested = await searchParams;
  const requestedSeason = firstValue(requested.season);
  const parsedSeason = parseSeasonId(requestedSeason);
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const gameDates = selectedSeason
    ? await listGameDates(selectedSeason.id)
    : [];
  const requestedDate = parseGameDate(firstValue(requested.date));
  const selectedDate =
    gameDates.find((entry) => entry.date === requestedDate)?.date ??
    gameDates[0]?.date;
  const games =
    selectedSeason && selectedDate
      ? await getGamesByDate(selectedSeason.id, selectedDate)
      : [];
  const selectedDateIndex = gameDates.findIndex(
    (entry) => entry.date === selectedDate,
  );
  const newerDate =
    selectedDateIndex > 0 ? gameDates[selectedDateIndex - 1]?.date : undefined;
  const olderDate =
    selectedDateIndex >= 0
      ? gameDates[selectedDateIndex + 1]?.date
      : undefined;
  const playoffGames = games.filter((game) => game.gameType === 3).length;
  const completedGames = games.filter(hasFinalScore).length;

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="games" />

      <section className="py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.18em] text-cyan-300">
              Schedule and results
            </p>
            <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
              {selectedDate
                ? formatDate(selectedDate)
                : "No schedule available"}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
              Every NHL matchup, final score, and shot total from the selected
              date, using the team name active in that season.
            </p>
          </div>

          <form
            method="get"
            className="grid w-full max-w-xl gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <label className="text-sm font-medium text-slate-300">
              Season
              <select
                name="season"
                defaultValue={selectedSeason?.id}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-300/60"
              >
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-300">
              Game date
              <select
                name="date"
                defaultValue={selectedDate}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-300/60"
              >
                {gameDates.map((entry) => (
                  <option key={entry.date} value={entry.date}>
                    {entry.date} · {entry.gameCount}{" "}
                    {entry.gameCount === 1 ? "game" : "games"}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            >
              View
            </button>
          </form>
        </div>

        {selectedSeason && selectedDate ? (
          <>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-400">
                {selectedSeason.label} season · {gameDates.length} game dates
              </p>
              <nav aria-label="Game date navigation" className="flex gap-2">
                <DateLink
                  label="← Older"
                  seasonId={selectedSeason.id}
                  date={olderDate}
                />
                <DateLink
                  label="Newer →"
                  seasonId={selectedSeason.id}
                  date={newerDate}
                />
              </nav>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <SummaryCard label="Games" value={String(games.length)} />
              <SummaryCard
                label="Completed"
                value={`${completedGames} of ${games.length}`}
              />
              <SummaryCard
                label="Schedule type"
                value={
                  playoffGames === games.length
                    ? "Playoffs"
                    : playoffGames > 0
                      ? "Regular + playoffs"
                      : "Regular season"
                }
              />
            </div>

            {games.length > 0 ? (
              <div className="mt-8 grid gap-4 lg:grid-cols-2">
                {games.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-6 text-amber-100">
                No games are available for this date.
              </div>
            )}
          </>
        ) : (
          <div className="mt-10 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-6 text-amber-100">
            No game schedule is available.
          </div>
        )}
      </section>
    </main>
  );
}

function GameCard({ game }: { game: GameSummary }) {
  const completed = hasFinalScore(game);

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3 text-xs uppercase tracking-[0.12em]">
        <span className="text-slate-500">
          {game.gameType === 3 ? "Playoffs" : "Regular season"}
        </span>
        <span className={completed ? "text-emerald-200" : "text-cyan-200"}>
          {completed ? finalLabel(game.lastPeriodType) : game.state}
        </span>
      </div>
      <div className="space-y-4 p-5">
        <TeamLine team={game.awayTeam} seasonId={game.seasonId} />
        <TeamLine team={game.homeTeam} seasonId={game.seasonId} />
      </div>
      <div className="flex items-center justify-between border-t border-white/[0.07] px-5 py-3 text-xs text-slate-500">
        <span>{formatTime(game.startTimeUtc)}</span>
        <Link
          href={`/games/${game.nhlGameId}`}
          className="font-medium text-cyan-300 transition hover:text-cyan-200"
        >
          View box score →
        </Link>
      </div>
    </article>
  );
}

function TeamLine({
  team,
  seasonId,
}: {
  team: GameSummary["awayTeam"];
  seasonId: number;
}) {
  return (
    <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-3">
      <span className="font-mono text-sm font-semibold text-cyan-200">
        {team.abbreviation}
      </span>
      <div>
        <Link
          href={`/teams/${team.nhlTeamId}?season=${seasonId}`}
          className="font-medium text-white transition hover:text-cyan-200"
        >
          {team.name}
        </Link>
        <p className="mt-0.5 text-xs text-slate-500">
          {team.shotsOnGoal === null
            ? "Shots unavailable"
            : `${team.shotsOnGoal} shots`}
        </p>
      </div>
      <span className="text-3xl font-semibold tabular-nums text-white">
        {team.score ?? "—"}
      </span>
    </div>
  );
}

function DateLink({
  label,
  seasonId,
  date,
}: {
  label: string;
  seasonId: number;
  date: string | undefined;
}) {
  const className =
    "rounded-lg border border-white/10 px-3 py-2 text-sm font-medium";

  return date ? (
    <Link
      href={`/games?season=${seasonId}&date=${date}`}
      className={`${className} text-slate-300 transition hover:border-cyan-300/40 hover:text-white`}
    >
      {label}
    </Link>
  ) : (
    <span aria-disabled="true" className={`${className} text-slate-700`}>
      {label}
    </span>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </article>
  );
}

function hasFinalScore(game: GameSummary): boolean {
  return game.awayTeam.score !== null && game.homeTeam.score !== null;
}

function finalLabel(lastPeriodType: string | null): string {
  return lastPeriodType && lastPeriodType !== "REG"
    ? `Final · ${lastPeriodType}`
    : "Final";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatTime(value: string): string {
  return `${new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value))} start`;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
