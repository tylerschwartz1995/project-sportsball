import Link from "next/link";

import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import type { GameTeamSummary } from "@/contracts/game";
import type {
  GamePlayByPlay,
  PlayByPlayEvent,
  PlayByPlayPlayer,
} from "@/contracts/play-by-play";

export function GamePlayByPlayView({
  data,
  awayTeam,
  homeTeam,
  seasonId,
}: {
  data: GamePlayByPlay;
  awayTeam: GameTeamSummary;
  homeTeam: GameTeamSummary;
  seasonId: number;
}) {
  if (data.events.length === 0) {
    return null;
  }

  const goals = data.events.filter(
    (event) => event.typeDescription === "goal",
  );
  const periods = groupEventsByPeriod(data.events);

  return (
    <section
      id="scoring"
      className="workspace-section-divider scroll-mt-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-300">
            Official NHL play-by-play
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-white">
            Scoring and game timeline
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Review every scoring play, then expand a period to follow the
            recorded events in chronological order.
          </p>
        </div>
        <p className="text-sm text-slate-500">
          {data.events.length} recorded plays
        </p>
      </div>

      <ScoringSummary
        goals={goals}
        awayTeam={awayTeam}
        homeTeam={homeTeam}
        seasonId={seasonId}
      />

      <div className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-300">
              Event timeline
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              Period by period
            </h3>
          </div>
          <p className="text-sm text-slate-500">
            Goals and penalties are highlighted
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {periods.map(({ periodNumber, periodType, events }) => (
            <PeriodTimeline
              key={`${periodType}-${periodNumber}`}
              periodNumber={periodNumber}
              periodType={periodType}
              events={events}
              seasonId={seasonId}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ScoringSummary({
  goals,
  awayTeam,
  homeTeam,
  seasonId,
}: {
  goals: PlayByPlayEvent[];
  awayTeam: GameTeamSummary;
  homeTeam: GameTeamSummary;
  seasonId: number;
}) {
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 className="text-xl font-semibold text-white">Scoring Summary</h3>
        <p className="text-sm text-slate-500">
          {goals.length} {goals.length === 1 ? "goal" : "goals"}
        </p>
      </div>

      {goals.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-sm text-slate-400">
          No goals were recorded in the play-by-play.
        </p>
      ) : (
        <div className="data-table-shell mt-4">
          <SortableTable defaultSortKey="gameTime" defaultDirection="asc">
            <div className="workspace-table-scroll">
              <table className="workspace-table min-w-[900px]">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.12em] text-slate-400">
                    <SortableHeader
                      label="Period"
                      sortKey="period"
                      align="left"
                      defaultDirection="asc"
                    />
                    <SortableHeader
                      label="Time"
                      sortKey="gameTime"
                      align="left"
                      defaultDirection="asc"
                    />
                    <SortableHeader
                      label="Team"
                      sortKey="team"
                      align="left"
                      defaultDirection="asc"
                    />
                    <SortableHeader
                      label="Scorer"
                      sortKey="scorer"
                      align="left"
                      defaultDirection="asc"
                    />
                    <SortableHeader
                      label="Assists"
                      sortKey="assists"
                      align="left"
                      defaultDirection="asc"
                    />
                    <SortableHeader
                      label="Type"
                      sortKey="type"
                      align="left"
                      defaultDirection="asc"
                    />
                    <SortableHeader label="Score" sortKey="score" />
                  </tr>
                </thead>
                <tbody>
                  {goals.map((goal) => {
                    const scorer = playerForRole(goal, "scorer");
                    const assists = [
                      playerForRole(goal, "primary_assist"),
                      playerForRole(goal, "secondary_assist"),
                    ].filter((player): player is PlayByPlayPlayer =>
                      Boolean(player),
                    );
                    const gameTime =
                      (goal.periodNumber - 1) * 1_200 +
                      (goal.timeInPeriodSeconds ?? 0);

                    return (
                      <tr
                        key={goal.sourceEventId}
                        className="border-b border-white/[0.06] text-slate-300 last:border-0 hover:bg-white/[0.035]"
                      >
                        <td
                          className="px-4 py-3"
                          data-sort-value={goal.periodNumber}
                        >
                          {periodLabel(goal.periodNumber, goal.periodType)}
                        </td>
                        <td
                          className="px-4 py-3 tabular-nums"
                          data-sort-value={gameTime}
                        >
                          {goal.timeInPeriod}
                        </td>
                        <td className="px-4 py-3">
                          {goal.ownerTeam ? (
                            <Link
                              href={`/teams/${goal.ownerTeam.nhlTeamId}?season=${seasonId}`}
                              className="font-medium text-white transition hover:text-cyan-200"
                            >
                              {goal.ownerTeam.abbreviation}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <PlayerLink player={scorer} seasonId={seasonId} />
                        </td>
                        <td className="px-4 py-3">
                          {assists.length > 0 ? (
                            <span className="flex flex-wrap gap-x-2 gap-y-1">
                              {assists.map((player) => (
                                <PlayerLink
                                  key={`${goal.sourceEventId}-${player.role}`}
                                  player={player}
                                  seasonId={seasonId}
                                />
                              ))}
                            </span>
                          ) : (
                            <span className="text-slate-600">Unassisted</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {goalTypeLabel(goal, awayTeam, homeTeam)}
                        </td>
                        <td
                          className="px-4 py-3 text-right font-semibold tabular-nums text-white"
                          data-sort-value={
                            (goal.awayScore ?? 0) + (goal.homeScore ?? 0)
                          }
                        >
                          {scoreLabel(goal, awayTeam, homeTeam)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SortableTable>
        </div>
      )}
    </section>
  );
}

function PeriodTimeline({
  periodNumber,
  periodType,
  events,
  seasonId,
}: {
  periodNumber: number;
  periodType: string;
  events: PlayByPlayEvent[];
  seasonId: number;
}) {
  const goalCount = events.filter(
    (event) => event.typeDescription === "goal",
  ).length;
  const penaltyCount = events.filter(
    (event) => event.typeDescription === "penalty",
  ).length;

  return (
    <details className="workspace-timeline-period group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-white/[0.035] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
        <span>
          <span className="font-semibold text-white">
            {periodLabel(periodNumber, periodType)}
          </span>
          <span className="ml-3 text-sm text-slate-500">
            {events.length} plays · {goalCount} G · {penaltyCount} penalties
          </span>
        </span>
        <span
          aria-hidden="true"
          className="text-cyan-300 transition group-open:rotate-45"
        >
          +
        </span>
      </summary>

      <ol className="border-t border-white/[0.07]">
        {events.map((event) => (
          <TimelineEvent
            key={event.sourceEventId}
            event={event}
            seasonId={seasonId}
          />
        ))}
      </ol>
    </details>
  );
}

function TimelineEvent({
  event,
  seasonId,
}: {
  event: PlayByPlayEvent;
  seasonId: number;
}) {
  const prominent =
    event.typeDescription === "goal" || event.typeDescription === "penalty";

  return (
    <li
      className={`grid gap-3 border-b border-white/[0.055] px-5 py-4 [contain-intrinsic-size:auto_96px] [content-visibility:auto] last:border-0 sm:grid-cols-[4.5rem_7rem_1fr] ${
        prominent
          ? event.typeDescription === "goal"
            ? "bg-emerald-300/[0.055]"
            : "bg-amber-300/[0.045]"
          : ""
      }`}
    >
      <time className="font-mono text-sm tabular-nums text-slate-400">
        {event.timeInPeriod}
      </time>
      <div>
        <p
          className={`text-xs font-semibold uppercase tracking-[0.12em] ${
            event.typeDescription === "goal"
              ? "text-emerald-300"
              : event.typeDescription === "penalty"
                ? "text-amber-300"
                : "text-slate-500"
          }`}
        >
          {humanize(event.typeDescription)}
        </p>
        {event.ownerTeam ? (
          <Link
            href={`/teams/${event.ownerTeam.nhlTeamId}?season=${seasonId}`}
            className="mt-1 inline-block text-xs text-cyan-300 transition hover:text-cyan-200"
          >
            {event.ownerTeam.abbreviation}
          </Link>
        ) : null}
      </div>
      <div>
        <p className="text-sm leading-6 text-slate-300">
          {eventDescription(event)}
        </p>
        {event.players.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {event.players.map((player) => (
              <span
                key={`${event.sourceEventId}-${player.sourcePlayerId}-${player.role}`}
                className="rounded-md border border-white/[0.07] bg-slate-950/45 px-2 py-1 text-xs text-slate-500"
              >
                <PlayerLink player={player} seasonId={seasonId} />
                <span className="ml-1 text-slate-600">
                  · {humanize(player.role)}
                </span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function PlayerLink({
  player,
  seasonId,
}: {
  player: PlayByPlayPlayer | undefined;
  seasonId: number;
}) {
  if (!player) {
    return <span className="text-slate-600">Unavailable</span>;
  }

  const name = player.name ?? `NHL player ${player.sourcePlayerId}`;
  return player.nhlPlayerId === null ? (
    <span className="text-slate-400">{name}</span>
  ) : (
    <Link
      href={`/players/${player.nhlPlayerId}?season=${seasonId}`}
      className="text-slate-200 transition hover:text-cyan-200"
    >
      {name}
    </Link>
  );
}

function groupEventsByPeriod(events: PlayByPlayEvent[]) {
  const groups = new Map<
    string,
    {
      periodNumber: number;
      periodType: string;
      events: PlayByPlayEvent[];
    }
  >();

  for (const event of events) {
    const key = `${event.periodType}-${event.periodNumber}`;
    const group = groups.get(key) ?? {
      periodNumber: event.periodNumber,
      periodType: event.periodType,
      events: [],
    };
    group.events.push(event);
    groups.set(key, group);
  }

  return Array.from(groups.values());
}

function playerForRole(
  event: PlayByPlayEvent,
  role: string,
): PlayByPlayPlayer | undefined {
  return event.players.find((player) => player.role === role);
}

function eventDescription(event: PlayByPlayEvent): string {
  const playerName = (role: string) =>
    playerForRole(event, role)?.name ?? "Unknown player";

  switch (event.typeDescription) {
    case "goal": {
      const assists = [
        playerForRole(event, "primary_assist")?.name,
        playerForRole(event, "secondary_assist")?.name,
      ].filter(Boolean);
      const detail = [event.shotType ? `${humanize(event.shotType)} shot` : null]
        .filter(Boolean)
        .join(", ");
      return `${playerName("scorer")} scored${detail ? ` on a ${detail}` : ""}${
        assists.length > 0 ? `; assisted by ${assists.join(" and ")}` : ""
      }.`;
    }
    case "penalty": {
      const duration = event.penaltyDurationMinutes
        ? `${event.penaltyDurationMinutes}-minute `
        : "";
      const description = humanize(
        event.penaltyDescription ?? event.reason ?? "penalty",
      );
      const drawnBy = playerForRole(event, "penalty_drawn_by")?.name;
      return `${playerName("penalty_committed_by")} received a ${duration}${description} penalty${
        drawnBy ? ` drawn by ${drawnBy}` : ""
      }.`;
    }
    case "shot-on-goal":
      return `${playerName("shooter")} put a ${
        event.shotType ? `${humanize(event.shotType)} ` : ""
      }shot on goal against ${playerName("goalie_in_net")}.`;
    case "missed-shot":
      return `${playerName("shooter")} missed the net${
        event.reason ? ` (${humanize(event.reason)})` : ""
      }.`;
    case "blocked-shot":
      return `${playerName("shooter")}'s shot attempt was blocked by ${playerName("blocker")}.`;
    case "hit":
      return `${playerName("hitter")} hit ${playerName("hittee")}.`;
    case "faceoff":
      return `${playerName("faceoff_winner")} won the faceoff against ${playerName("faceoff_loser")}.`;
    case "giveaway":
      return `${playerName("event_player")} was charged with a giveaway.`;
    case "takeaway":
      return `${playerName("event_player")} recorded a takeaway.`;
    case "stoppage":
      return event.reason
        ? `Play stopped: ${humanize(event.reason)}.`
        : "Play stopped.";
    case "period-start":
      return `${periodLabel(event.periodNumber, event.periodType)} started.`;
    case "period-end":
      return `${periodLabel(event.periodNumber, event.periodType)} ended.`;
    case "game-end":
      return "The game ended.";
    default:
      return event.reason
        ? `${humanize(event.typeDescription)}: ${humanize(event.reason)}.`
        : `${humanize(event.typeDescription)} recorded.`;
  }
}

function goalTypeLabel(
  goal: PlayByPlayEvent,
  awayTeam: GameTeamSummary,
  homeTeam: GameTeamSummary,
): string {
  const strength = strengthLabel(goal, awayTeam, homeTeam);
  const shot = goal.shotType ? humanize(goal.shotType) : null;
  return [strength, shot].filter(Boolean).join(" · ") || "—";
}

function strengthLabel(
  event: PlayByPlayEvent,
  awayTeam: GameTeamSummary,
  homeTeam: GameTeamSummary,
): string | null {
  if (!event.situationCode || !/^\d{4}$/.test(event.situationCode)) {
    return null;
  }

  const [awayGoalie, awaySkaters, homeSkaters, homeGoalie] =
    event.situationCode.split("").map(Number);
  const ownerIsHome = event.ownerTeam?.nhlTeamId === homeTeam.nhlTeamId;
  const ownerIsAway = event.ownerTeam?.nhlTeamId === awayTeam.nhlTeamId;

  if (!ownerIsHome && !ownerIsAway) {
    return null;
  }

  const opponentGoalie = ownerIsHome ? awayGoalie : homeGoalie;
  if (opponentGoalie === 0) {
    return "Empty net";
  }

  const forSkaters = ownerIsHome ? homeSkaters : awaySkaters;
  const againstSkaters = ownerIsHome ? awaySkaters : homeSkaters;
  return forSkaters === againstSkaters
    ? `${forSkaters}-on-${againstSkaters}`
    : forSkaters > againstSkaters
      ? `Power play · ${forSkaters}-on-${againstSkaters}`
      : `Short-handed · ${forSkaters}-on-${againstSkaters}`;
}

function scoreLabel(
  event: PlayByPlayEvent,
  awayTeam: GameTeamSummary,
  homeTeam: GameTeamSummary,
): string {
  return event.awayScore === null || event.homeScore === null
    ? "—"
    : `${awayTeam.abbreviation} ${event.awayScore}–${event.homeScore} ${homeTeam.abbreviation}`;
}

function periodLabel(periodNumber: number, periodType: string): string {
  if (periodType === "OT") {
    return "Overtime";
  }
  if (periodType === "SO") {
    return "Shootout";
  }
  const suffix =
    periodNumber === 1
      ? "st"
      : periodNumber === 2
        ? "nd"
        : periodNumber === 3
          ? "rd"
          : "th";
  return `${periodNumber}${suffix} period`;
}

function humanize(value: string): string {
  return value
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
