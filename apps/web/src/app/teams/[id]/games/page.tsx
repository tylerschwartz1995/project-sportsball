import Link from "next/link";
import { notFound } from "next/navigation";

import { SeasonPicker } from "@/app/_components/season-picker";
import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { parseNhlId } from "@/contracts/entity";
import type { TeamGameLogEntry } from "@/contracts/game-log";
import { parseSeasonId } from "@/contracts/season";
import { getTeamGameLog } from "@/data/game-logs";
import { listSeasons } from "@/data/seasons";
import { listTeamSeasonIds } from "@/data/teams";

export const dynamic = "force-dynamic";

type TeamGamesPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string | string[] }>;
};

export default async function TeamGamesPage({
  params,
  searchParams,
}: TeamGamesPageProps) {
  const nhlTeamId = parseNhlId((await params).id);
  if (nhlTeamId === null) {
    notFound();
  }

  const [seasons, teamSeasonIds] = await Promise.all([
    listSeasons(),
    listTeamSeasonIds(nhlTeamId),
  ]);
  const availableSeasonIds = new Set(teamSeasonIds);
  const availableSeasons = seasons.filter((season) =>
    availableSeasonIds.has(season.id),
  );
  const requestedSeason = parseSeasonId(
    firstValue((await searchParams).season),
  );
  const selectedSeason =
    availableSeasons.find((season) => season.id === requestedSeason) ??
    availableSeasons[0];

  if (!selectedSeason) {
    notFound();
  }

  const log = await getTeamGameLog(nhlTeamId, selectedSeason.id);
  if (!log) {
    notFound();
  }

  const recentGames = log.games.slice(0, 10);
  const recent = summarizeRecentTeamGames(recentGames);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="teams" />

      <section className="py-10">
        <Link
          href={`/teams/${log.team.nhlTeamId}?season=${selectedSeason.id}`}
          className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
        >
          ← {log.team.name}
        </Link>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.18em] text-cyan-300">
              {log.team.abbreviation} · Regular season and playoffs
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
              Game log
            </h2>
            <p className="mt-4 text-base text-slate-400">
              {selectedSeason.label} results, shot totals, and five-on-five
              expected-goal share.
            </p>
          </div>
          <SeasonPicker
            seasons={availableSeasons}
            selectedSeasonId={selectedSeason.id}
          />
        </div>

        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-300">
                Recent form
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-white">
                Last {recentGames.length} games
              </h3>
            </div>
            <p className="text-sm text-slate-500">
              Newest game appears first
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Record"
              value={`${recent.wins}-${recent.losses}-${recent.overtimeLosses}`}
              detail="W-L-OTL"
            />
            <SummaryCard
              label="Goals"
              value={`${recent.goalsFor}–${recent.goalsAgainst}`}
              detail="For–against"
            />
            <SummaryCard
              label="Goal differential"
              value={formatSigned(recent.goalsFor - recent.goalsAgainst)}
              detail="Across this window"
            />
            <SummaryCard
              label="5v5 xG%"
              value={formatPercentage(recent.averageXGoalsPercentage)}
              detail={
                recent.advancedGames > 0
                  ? `${recent.advancedGames} games available`
                  : "Not available"
              }
            />
          </div>

          <div
            className="mt-4 flex flex-wrap gap-2"
            aria-label="Recent game results"
          >
            {recentGames.map((game) => (
              <Link
                key={game.nhlGameId}
                href={`/games/${game.nhlGameId}`}
                title={`${game.gameDate}: ${game.isHome ? "vs" : "at"} ${game.opponent.name}, ${game.score}-${game.opponentScore}`}
                className={`inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition hover:-translate-y-0.5 ${resultClassName(game.result)}`}
              >
                {game.result}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-300">
                Full season
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-white">
                All games
              </h3>
            </div>
            <p className="text-sm text-slate-500">
              {log.games.length} completed games
            </p>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
            <SortableTable defaultSortKey="date">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.12em] text-slate-400">
                      <SortableHeader
                        label="Date"
                        sortKey="date"
                        align="left"
                      />
                      <SortableHeader
                        label="Type"
                        sortKey="type"
                        align="left"
                      />
                      <SortableHeader
                        label="Venue"
                        sortKey="venue"
                        align="left"
                        defaultDirection="asc"
                      />
                      <SortableHeader
                        label="Opponent"
                        sortKey="opponent"
                        align="left"
                        defaultDirection="asc"
                      />
                      <SortableHeader
                        label="Result"
                        sortKey="result"
                        align="left"
                      />
                      <SortableHeader label="Score" sortKey="score" />
                      <SortableHeader label="SOG" sortKey="shots" />
                      <SortableHeader label="Opp SOG" sortKey="opponentShots" />
                      <SortableHeader label="5v5 xG%" sortKey="xGoalsShare" />
                      <SortableHeader label="xGF" sortKey="xGoalsFor" />
                      <SortableHeader label="xGA" sortKey="xGoalsAgainst" />
                    </tr>
                  </thead>
                  <tbody>
                    {log.games.map((game) => (
                      <TeamGameRow
                        key={game.nhlGameId}
                        game={game}
                        seasonId={selectedSeason.id}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </SortableTable>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Advanced columns are five-on-five MoneyPuck metrics. A dash means
            that provider coverage is unavailable for that game.
          </p>
        </section>
      </section>
    </main>
  );
}

function TeamGameRow({
  game,
  seasonId,
}: {
  game: TeamGameLogEntry;
  seasonId: number;
}) {
  return (
    <tr className="border-b border-white/[0.06] text-slate-300 last:border-0 hover:bg-white/[0.035]">
      <td
        className="px-3 py-3"
        data-sort-value={game.gameDate.replaceAll("-", "")}
      >
        <Link
          href={`/games/${game.nhlGameId}`}
          className="font-medium text-white transition hover:text-cyan-200"
        >
          {formatDate(game.gameDate)}
        </Link>
      </td>
      <td className="px-3 py-3">{game.gameType === 3 ? "Playoffs" : "Regular"}</td>
      <td className="px-3 py-3">{game.isHome ? "Home" : "Away"}</td>
      <td className="px-3 py-3">
        <Link
          href={`/teams/${game.opponent.nhlTeamId}?season=${seasonId}`}
          className="transition hover:text-cyan-200"
        >
          {game.opponent.abbreviation}
        </Link>
      </td>
      <td className="px-3 py-3 font-semibold" data-sort-value={game.result}>
        <span className={resultTextClassName(game.result)}>{game.result}</span>
        {game.lastPeriodType === "OT" || game.lastPeriodType === "SO"
          ? ` ${game.lastPeriodType}`
          : ""}
      </td>
      <NumericCell
        value={`${game.score}–${game.opponentScore}`}
        sortValue={game.score - game.opponentScore}
        highlight
      />
      <NumericCell value={game.shotsOnGoal} />
      <NumericCell value={game.opponentShotsOnGoal} />
      <NumericCell
        value={formatPercentage(game.fiveOnFiveXGoalsPercentage)}
        sortValue={game.fiveOnFiveXGoalsPercentage}
      />
      <NumericCell
        value={formatDecimal(game.fiveOnFiveXGoalsFor)}
        sortValue={game.fiveOnFiveXGoalsFor}
      />
      <NumericCell
        value={formatDecimal(game.fiveOnFiveXGoalsAgainst)}
        sortValue={game.fiveOnFiveXGoalsAgainst}
      />
    </tr>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function NumericCell({
  value,
  sortValue,
  highlight = false,
}: {
  value: string | number | null;
  sortValue?: string | number | null;
  highlight?: boolean;
}) {
  return (
    <td
      className={`px-3 py-3 text-right tabular-nums ${highlight ? "font-semibold text-white" : ""}`}
      data-sort-value={sortValue ?? value ?? ""}
    >
      {value ?? "—"}
    </td>
  );
}

function summarizeRecentTeamGames(games: TeamGameLogEntry[]) {
  const advanced = games.filter(
    (game) => game.fiveOnFiveXGoalsPercentage !== null,
  );

  return {
    wins: games.filter((game) => game.result === "W").length,
    losses: games.filter((game) => game.result === "L").length,
    overtimeLosses: games.filter((game) => game.result === "OTL").length,
    goalsFor: games.reduce((total, game) => total + game.score, 0),
    goalsAgainst: games.reduce(
      (total, game) => total + game.opponentScore,
      0,
    ),
    averageXGoalsPercentage:
      advanced.length > 0
        ? advanced.reduce(
            (total, game) =>
              total + (game.fiveOnFiveXGoalsPercentage ?? 0),
            0,
          ) / advanced.length
        : null,
    advancedGames: advanced.length,
  };
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatPercentage(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatDecimal(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function resultClassName(result: TeamGameLogEntry["result"]): string {
  if (result === "W") {
    return "border-emerald-300/30 bg-emerald-300/10 text-emerald-200";
  }
  if (result === "OTL") {
    return "border-amber-300/30 bg-amber-300/10 text-amber-200";
  }
  return "border-rose-300/30 bg-rose-300/10 text-rose-200";
}

function resultTextClassName(result: TeamGameLogEntry["result"]): string {
  if (result === "W") {
    return "text-emerald-300";
  }
  if (result === "OTL") {
    return "text-amber-300";
  }
  return "text-rose-300";
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
