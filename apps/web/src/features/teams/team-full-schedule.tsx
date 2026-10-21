import { TableScroll } from "@/components/ui/table-scroll";
import Link from "@/components/ui/exploration-link";

import { LocalGameTime } from "@/features/games/local-game-time";
import { TeamGameRecord } from "@/features/teams/team-game-record";
import { TeamLogo } from "@/features/teams/team-logo";
import type { GameSummary } from "@/contracts/game";

export function TeamFullSchedule({
  games,
  teamNhlId,
  seasonId,
  phase,
}: {
  games: GameSummary[];
  teamNhlId: number;
  seasonId: number;
  phase: "regular" | "playoffs";
}) {
  const monthGroups = groupGamesByMonth(games);
  const firstUpcomingId = games.find((game) => !isCompletedGame(game))?.nhlGameId;

  return (
    <section
      id="schedule"
      className="workspace-width-data mt-8 scroll-mt-6"
    >
      {monthGroups.length > 0 ? (
        <TableScroll className="data-table-shell workspace-table-scroll mt-6 overflow-hidden">
          <table className="mobile-schedule-table workspace-table workspace-table-dense w-full min-w-[960px] table-fixed">
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[34%]" />
              <col className="w-[18%]" />
              <col className="w-[14%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead>
              <tr>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Opponent</th>
                <th className="px-5 py-3 text-center">Venue</th>
                <th className="px-5 py-3 text-center">Result</th>
                <th className="px-5 py-3 text-center">Score / Start</th>
              </tr>
            </thead>
            <tbody>
              {monthGroups.map((group) => (
                <MonthScheduleRows
                  key={group.key}
                  group={group}
                  firstUpcomingId={firstUpcomingId}
                  teamNhlId={teamNhlId}
                  seasonId={seasonId}
                />
              ))}
            </tbody>
          </table>
        </TableScroll>
      ) : (
        <div className="workspace-empty-state mt-6">
          No games are stored for this selection.
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--muted)]">
          Game times use your local timezone. Future times may change.
        </p>
        <Link
          href={`/games?season=${seasonId}&phase=${phase}`}
          className="text-sm font-medium text-[var(--accent)] transition hover:text-[var(--foreground)]"
        >
          Browse the league schedule →
        </Link>
      </div>
    </section>
  );
}

function MonthScheduleRows({
  group,
  firstUpcomingId,
  teamNhlId,
  seasonId,
}: {
  group: ReturnType<typeof groupGamesByMonth>[number];
  firstUpcomingId: number | undefined;
  teamNhlId: number;
  seasonId: number;
}) {
  return (
    <>
      <tr>
        <th
          colSpan={5}
          scope="rowgroup"
          className="border-y border-[var(--border)] bg-[var(--surface-raised)] px-5 py-2.5 text-left font-mono text-xs uppercase tracking-[0.16em] text-[var(--muted)] first:border-t-0"
        >
          {group.label}
        </th>
      </tr>
      {group.games.map((game) => {
        const upcomingBoundary =
          game.nhlGameId === firstUpcomingId;
        return (
          <ScheduleGameRows
            key={game.nhlGameId}
            game={game}
            teamNhlId={teamNhlId}
            seasonId={seasonId}
            showUpcomingBoundary={upcomingBoundary}
          />
        );
      })}
    </>
  );
}

function ScheduleGameRows({
  game,
  teamNhlId,
  seasonId,
  showUpcomingBoundary,
}: {
  game: GameSummary;
  teamNhlId: number;
  seasonId: number;
  showUpcomingBoundary: boolean;
}) {
  const isHome = game.homeTeam.nhlTeamId === teamNhlId;
  const team = isHome ? game.homeTeam : game.awayTeam;
  const opponent = isHome ? game.awayTeam : game.homeTeam;
  const completed = isCompletedGame(game);
  const result = completed ? gameResult(game, teamNhlId) : gameStateLabel(game.state);

  return (
    <>
      {showUpcomingBoundary ? (
        <tr>
          <td
            colSpan={5}
            className="border-y border-[var(--accent)]/30 bg-[var(--accent-soft)] px-5 py-2 font-mono text-xs uppercase tracking-[0.14em] text-[var(--accent)]"
          >
            Upcoming games
          </td>
        </tr>
      ) : null}
      <tr className={showUpcomingBoundary ? "bg-[var(--accent-soft)]/30" : undefined}>
        <td className="whitespace-nowrap px-5 text-left tabular-nums">
          <Link href={`/games/${game.nhlGameId}`} className="font-medium text-[var(--foreground)]">
            {formatGameDate(game.gameDate)}
          </Link>
        </td>
        <td className="px-5 text-left">
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <TeamLogo {...opponent} size="tiny" decorative />
            <Link
              href={`/teams/${opponent.nhlTeamId}?season=${seasonId}&phase=${game.gameType === 3 ? "playoffs" : "regular"}`}
              className="font-medium text-[var(--foreground)]"
            >
              {opponent.name}
            </Link>
            <TeamGameRecord record={opponent.record} />
          </span>
        </td>
        <td className="px-5 text-center text-[var(--muted)]">{isHome ? "Home" : "Away"}</td>
        <td className="px-5 text-center">
          <span className={resultClassName(result)}>{result}</span>
        </td>
        <td className="whitespace-nowrap px-5 text-center font-semibold text-[var(--foreground)] tabular-nums">
          {completed ? (
            `${team.score}–${opponent.score}`
          ) : (
            <LocalGameTime value={game.startTimeUtc} />
          )}
        </td>
      </tr>
    </>
  );
}

function isCompletedGame(game: GameSummary) {
  return (
    (game.state === "FINAL" || game.state === "OFF") &&
    game.awayTeam.score !== null &&
    game.homeTeam.score !== null
  );
}

function gameResult(game: GameSummary, teamNhlId: number) {
  const team = game.homeTeam.nhlTeamId === teamNhlId ? game.homeTeam : game.awayTeam;
  const opponent = game.homeTeam.nhlTeamId === teamNhlId ? game.awayTeam : game.homeTeam;
  if (team.score! > opponent.score!) return "W";
  if (game.gameType === 2 && (game.lastPeriodType === "OT" || game.lastPeriodType === "SO")) {
    return "OTL";
  }
  return "L";
}

function gameStateLabel(state: string) {
  if (state === "LIVE" || state === "CRIT") return "Live";
  if (state === "POSTPONED") return "Postponed";
  return "Scheduled";
}

function resultClassName(result: string) {
  const tone =
    result === "W"
      ? "border-[var(--positive)]/30 bg-[var(--positive)]/10 text-[var(--positive)]"
      : result === "L"
        ? "border-[var(--negative)]/30 bg-[var(--negative)]/10 text-[var(--negative)]"
        : result === "OTL"
          ? "border-[var(--warning)]/30 bg-[var(--warning-soft)] text-[var(--warning)]"
          : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--muted)]";
  return `inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${tone}`;
}

function groupGamesByMonth(games: GameSummary[]) {
  const groups = new Map<string, GameSummary[]>();
  games.forEach((game) => {
    const key = game.gameDate.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), game]);
  });
  return [...groups.entries()].map(([key, monthGames]) => ({
    key,
    label: formatMonth(`${key}-01`),
    games: monthGames,
  }));
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatGameDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
