import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { parseNhlId } from "@/contracts/entity";
import type {
  GameBoxScoreTeam,
  GameGoalieStats,
  GameSkaterStats,
} from "@/contracts/game";
import { getGameBoxScore } from "@/data/games";

export const dynamic = "force-dynamic";

type GamePageProps = {
  params: Promise<{ id: string }>;
};

export default async function GamePage({ params }: GamePageProps) {
  const nhlGameId = parseNhlId((await params).id);
  if (nhlGameId === null) {
    notFound();
  }

  const game = await getGameBoxScore(nhlGameId);
  if (!game) {
    notFound();
  }

  const completed =
    game.awayTeam.score !== null && game.homeTeam.score !== null;
  const hasBoxScore =
    game.awayTeam.skaters.length > 0 ||
    game.homeTeam.skaters.length > 0 ||
    game.awayTeam.goalies.length > 0 ||
    game.homeTeam.goalies.length > 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="games" />

      <section className="py-10">
        <Link
          href={`/games?season=${game.seasonId}&date=${game.gameDate}`}
          className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
        >
          ← Games on {formatDate(game.gameDate)}
        </Link>

        <div className="mt-7 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4 text-xs uppercase tracking-[0.14em] sm:px-8">
            <span className="text-slate-500">
              {game.gameType === 3 ? "NHL playoffs" : "Regular season"}
            </span>
            <span className={completed ? "text-emerald-200" : "text-cyan-200"}>
              {completed ? finalLabel(game.lastPeriodType) : game.state}
            </span>
          </div>

          <div className="grid gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <ScoreTeam team={game.awayTeam} seasonId={game.seasonId} />
            <div className="text-center font-mono text-xs uppercase tracking-[0.2em] text-slate-600">
              at
            </div>
            <ScoreTeam
              team={game.homeTeam}
              seasonId={game.seasonId}
              align="right"
            />
          </div>

          <div className="grid gap-3 border-t border-white/[0.07] px-5 py-4 text-xs text-slate-500 sm:grid-cols-3 sm:px-8">
            <span>{formatDate(game.gameDate)}</span>
            <span className="sm:text-center">
              {formatTime(game.startTimeUtc)}
            </span>
            <span className="sm:text-right">NHL game {game.nhlGameId}</span>
          </div>
        </div>

        {hasBoxScore ? (
          <div className="mt-12 space-y-14">
            <TeamBoxScore team={game.awayTeam} seasonId={game.seasonId} />
            <TeamBoxScore team={game.homeTeam} seasonId={game.seasonId} />
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-6 text-amber-100">
            The player box score is not available yet.
          </div>
        )}
      </section>
    </main>
  );
}

function ScoreTeam({
  team,
  seasonId,
  align = "left",
}: {
  team: GameBoxScoreTeam;
  seasonId: number;
  align?: "left" | "right";
}) {
  return (
    <div
      className={
        align === "right"
          ? "flex items-center justify-between gap-5 lg:flex-row-reverse lg:text-right"
          : "flex items-center justify-between gap-5"
      }
    >
      <div>
        <p className="font-mono text-sm font-semibold text-cyan-200">
          {team.abbreviation}
        </p>
        <Link
          href={`/teams/${team.nhlTeamId}?season=${seasonId}`}
          className="mt-1 block text-xl font-semibold text-white transition hover:text-cyan-200 sm:text-2xl"
        >
          {team.name}
        </Link>
        <p className="mt-2 text-sm text-slate-500">
          {team.shotsOnGoal === null
            ? "Shots unavailable"
            : `${team.shotsOnGoal} shots`}
        </p>
      </div>
      <span className="text-6xl font-semibold tabular-nums text-white">
        {team.score ?? "—"}
      </span>
    </div>
  );
}

function TeamBoxScore({
  team,
  seasonId,
}: {
  team: GameBoxScoreTeam;
  seasonId: number;
}) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-300">
            {team.abbreviation} box score
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {team.name}
          </h2>
        </div>
        <p className="text-sm text-slate-500">
          {team.skaters.length} skaters · {team.goalies.length} goalies
        </p>
      </div>

      <h3 className="mt-7 text-lg font-semibold text-white">Skaters</h3>
      <SkaterTable
        players={team.skaters}
        seasonId={seasonId}
        teamName={team.name}
      />

      <h3 className="mt-8 text-lg font-semibold text-white">Goalies</h3>
      <GoalieTable
        players={team.goalies}
        seasonId={seasonId}
        teamName={team.name}
      />
    </section>
  );
}

function SkaterTable({
  players,
  seasonId,
  teamName,
}: {
  players: GameSkaterStats[];
  seasonId: number;
  teamName: string;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
      <SortableTable defaultSortKey="points">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] text-sm">
          <caption className="sr-only">{teamName} skater box score</caption>
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.035] text-left text-xs uppercase tracking-[0.12em] text-slate-400">
              <SortableHeader label="Player" sortKey="player" align="left" defaultDirection="asc" />
              <SortableHeader label="G" sortKey="goals" />
              <SortableHeader label="A" sortKey="assists" />
              <SortableHeader label="PTS" sortKey="points" />
              <SortableHeader label="+/-" sortKey="plusMinus" />
              <SortableHeader label="S" sortKey="shots" />
              <SortableHeader label="HIT" sortKey="hits" />
              <SortableHeader label="BLK" sortKey="blocks" />
              <SortableHeader label="PIM" sortKey="penaltyMinutes" />
              <SortableHeader label="TOI" sortKey="timeOnIce" />
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr
                key={player.nhlPlayerId}
                className="border-b border-white/[0.06] text-slate-300 last:border-0 hover:bg-white/[0.035]"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/players/${player.nhlPlayerId}?season=${seasonId}`}
                    className="font-medium text-white transition hover:text-cyan-200"
                  >
                    {player.name}
                  </Link>
                  <span className="ml-2 text-xs text-slate-500">
                    {player.sweaterNumber === null
                      ? ""
                      : `#${player.sweaterNumber} · `}
                    {player.position}
                  </span>
                </td>
                <NumericCell value={player.goals} />
                <NumericCell value={player.assists} />
                <NumericCell value={player.points} highlight />
                <NumericCell value={formatSigned(player.plusMinus)} />
                <NumericCell value={player.shotsOnGoal} />
                <NumericCell value={player.hits} />
                <NumericCell value={player.blockedShots} />
                <NumericCell value={player.penaltyMinutes} />
                <NumericCell value={formatTimeOnIce(player.timeOnIceSeconds)} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </SortableTable>
    </div>
  );
}

function GoalieTable({
  players,
  seasonId,
  teamName,
}: {
  players: GameGoalieStats[];
  seasonId: number;
  teamName: string;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
      <SortableTable defaultSortKey="shotsAgainst">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <caption className="sr-only">{teamName} goalie box score</caption>
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.035] text-left text-xs uppercase tracking-[0.12em] text-slate-400">
              <SortableHeader label="Goalie" sortKey="goalie" align="left" defaultDirection="asc" />
              <SortableHeader label="DEC" sortKey="decision" align="right" defaultDirection="asc" />
              <SortableHeader label="SA" sortKey="shotsAgainst" />
              <SortableHeader label="SV" sortKey="saves" />
              <SortableHeader label="GA" sortKey="goalsAgainst" defaultDirection="asc" />
              <SortableHeader label="SV%" sortKey="savePercentage" />
              <SortableHeader label="EV SV/GA" sortKey="evenStrength" />
              <SortableHeader label="PP SV/GA" sortKey="powerPlay" />
              <SortableHeader label="TOI" sortKey="timeOnIce" />
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr
                key={player.nhlPlayerId}
                className="border-b border-white/[0.06] text-slate-300 last:border-0 hover:bg-white/[0.035]"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/players/${player.nhlPlayerId}?season=${seasonId}`}
                    className="font-medium text-white transition hover:text-cyan-200"
                  >
                    {player.name}
                  </Link>
                  <span className="ml-2 text-xs text-slate-500">
                    {player.starter ? "Starter" : "Backup"}
                  </span>
                </td>
                <NumericCell value={player.decision ?? "—"} />
                <NumericCell value={player.shotsAgainst} />
                <NumericCell value={player.saves} />
                <NumericCell value={player.goalsAgainst} />
                <NumericCell
                  value={formatSavePercentage(player.savePercentage)}
                  highlight
                />
                <NumericCell
                  value={`${player.evenStrengthSaves}/${player.evenStrengthGoalsAgainst}`}
                />
                <NumericCell
                  value={`${player.powerPlaySaves}/${player.powerPlayGoalsAgainst}`}
                />
                <NumericCell
                  value={
                    player.timeOnIceSeconds
                      ? formatTimeOnIce(player.timeOnIceSeconds)
                      : "DNP"
                  }
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </SortableTable>
    </div>
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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}

function formatTimeOnIce(seconds: number | null): string {
  if (seconds === null) {
    return "—";
  }
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function formatSavePercentage(value: number | null): string {
  return value === null ? "—" : value.toFixed(3).replace(/^0/, "");
}

function finalLabel(lastPeriodType: string | null): string {
  return lastPeriodType && lastPeriodType !== "REG"
    ? `Final · ${lastPeriodType}`
    : "Final";
}
