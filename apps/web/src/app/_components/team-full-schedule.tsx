import Link from "next/link";

import { LocalGameTime } from "@/app/_components/local-game-time";
import { TeamGameRecord } from "@/app/_components/team-game-record";
import { TeamLogo } from "@/app/_components/team-logo";
import { SectionHeader } from "@/app/_components/ui-primitives";
import type { GameSummary } from "@/contracts/game";

export type TeamScheduleFilter = "all" | "completed" | "upcoming";

export function TeamFullSchedule({
  games,
  teamNhlId,
  seasonId,
  seasonLabel,
  phase,
  phaseLabel,
  filter,
}: {
  games: GameSummary[];
  teamNhlId: number;
  seasonId: number;
  seasonLabel: string;
  phase: "regular" | "playoffs";
  phaseLabel: string;
  filter: TeamScheduleFilter;
}) {
  const completedCount = games.filter(isCompletedGame).length;
  const upcomingCount = games.length - completedCount;
  const visibleGames = games.filter((game) => {
    if (filter === "completed") return isCompletedGame(game);
    if (filter === "upcoming") return !isCompletedGame(game);
    return true;
  });
  const monthGroups = groupGamesByMonth(visibleGames);
  const firstUpcomingId = games.find((game) => !isCompletedGame(game))?.nhlGameId;
  const schedulePath = `/teams/${teamNhlId}`;

  return (
    <section id="schedule" className="workspace-width-data mt-8 scroll-mt-6">
      <SectionHeader
        eyebrow="Schedule"
        title="Full Schedule"
        description={`${seasonLabel} ${phaseLabel.toLowerCase()} schedule. Completed results and remaining games appear together in chronological order.`}
        action={
          <p className="text-sm text-[var(--muted)] tabular-nums">
            {games.length} games · {completedCount} completed · {upcomingCount} upcoming
          </p>
        }
      />

      <nav
        className="mt-5 inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1"
        aria-label="Filter team schedule"
      >
        <ScheduleFilterLink
          active={filter === "all"}
          count={games.length}
          href={scheduleFilterHref(schedulePath, seasonId, phase, "all")}
          label="All"
        />
        <ScheduleFilterLink
          active={filter === "completed"}
          count={completedCount}
          href={scheduleFilterHref(schedulePath, seasonId, phase, "completed")}
          label="Completed"
        />
        <ScheduleFilterLink
          active={filter === "upcoming"}
          count={upcomingCount}
          href={scheduleFilterHref(schedulePath, seasonId, phase, "upcoming")}
          label="Upcoming"
        />
      </nav>

      {monthGroups.length > 0 ? (
        <div className="mt-6 space-y-5">
          {monthGroups.map((group) => (
            <section key={group.key} aria-labelledby={`schedule-${group.key}`}>
              <h4
                id={`schedule-${group.key}`}
                className="mb-2 font-mono text-xs uppercase tracking-[0.16em] text-[var(--muted)]"
              >
                {group.label}
              </h4>
              <div className="data-table-shell workspace-table-scroll overflow-hidden">
                <table className="workspace-table workspace-table-dense w-full min-w-[900px] table-fixed">
                  <colgroup>
                    <col className="w-40" />
                    <col />
                    <col className="w-28" />
                    <col className="w-28" />
                    <col className="w-44" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="text-left">Date</th>
                      <th className="text-left">Opponent</th>
                      <th className="text-left">Venue</th>
                      <th className="text-left">Result</th>
                      <th className="text-right">Score / Start</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.games.map((game) => {
                      const upcomingBoundary =
                        filter === "all" && game.nhlGameId === firstUpcomingId;
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
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="workspace-empty-state mt-6">
          No {filter === "all" ? "" : `${filter} `}games are stored for this selection.
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

function ScheduleFilterLink({
  active,
  count,
  href,
  label,
}: {
  active: boolean;
  count: number;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
          : "text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
      }`}
    >
      {label} <span className="font-mono text-xs tabular-nums">({count})</span>
    </Link>
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
            className="border-y border-[var(--accent)]/30 bg-[var(--accent-soft)] px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-[var(--accent)]"
          >
            Upcoming games
          </td>
        </tr>
      ) : null}
      <tr className={showUpcomingBoundary ? "bg-[var(--accent-soft)]/30" : undefined}>
        <td className="whitespace-nowrap tabular-nums">
          <Link href={`/games/${game.nhlGameId}`} className="font-medium text-[var(--foreground)]">
            {formatGameDate(game.gameDate)}
          </Link>
        </td>
        <td>
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
        <td className="text-[var(--muted)]">{isHome ? "Home" : "Away"}</td>
        <td>
          <span className={resultClassName(result)}>{result}</span>
        </td>
        <td className="whitespace-nowrap text-right font-semibold text-[var(--foreground)] tabular-nums">
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

function scheduleFilterHref(
  path: string,
  seasonId: number,
  phase: "regular" | "playoffs",
  filter: TeamScheduleFilter,
) {
  const params = new URLSearchParams({
    season: String(seasonId),
    phase,
    view: "schedule",
  });
  if (filter !== "all") params.set("scheduleState", filter);
  return `${path}?${params.toString()}`;
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
          ? "border-[var(--chart-secondary)]/30 bg-[var(--chart-secondary)]/10 text-[var(--chart-secondary)]"
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
