import { TableScroll } from "@/components/ui/table-scroll";
import Link from "@/components/ui/exploration-link";

import { TeamLogo } from "@/features/teams/team-logo";
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

  return (
    <section
      id="scoring"
      className="reference-game-scoring workspace-width-data scroll-mt-6"
    >
      <ScoringSummary
        goals={goals}
        awayTeam={awayTeam}
        homeTeam={homeTeam}
        seasonId={seasonId}
      />

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
    <section className="mt-6">
      {goals.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-5 text-sm text-[var(--muted)]">
          No goals were recorded in the play-by-play.
        </p>
      ) : (
        <div className="data-table-shell">
            <TableScroll className="workspace-table-scroll">
              <table role="table" className="workspace-scoring-table workspace-table workspace-table-dense workspace-table-semantic min-w-[1150px]">
                <colgroup>
                  <col style={{ width: "7%" }} /><col style={{ width: "8%" }} />
                  <col style={{ width: "10%" }} /><col style={{ width: "20%" }} />
                  <col style={{ width: "27%" }} /><col style={{ width: "12%" }} />
                  <col style={{ width: "16%" }} />
                </colgroup>
                <thead role="rowgroup">
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                    <th role="columnheader" scope="col">Period</th>
                    <th role="columnheader" scope="col">Time</th>
                    <th role="columnheader" scope="col">Team</th>
                    <th role="columnheader" scope="col">Scorer</th>
                    <th role="columnheader" scope="col">Assists</th>
                    <th role="columnheader" scope="col" title={`${awayTeam.abbreviation}–${homeTeam.abbreviation}, away score first.`}>Score</th>
                    <th role="columnheader" scope="col" title="PP: power play; SH: short-handed; EN: empty net.">Type</th>
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {[...goals].sort((a, b) => a.periodNumber - b.periodNumber || (a.timeInPeriodSeconds ?? 0) - (b.timeInPeriodSeconds ?? 0)).map((goal) => {
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
                      <tr role="row"
                        key={goal.sourceEventId}
                        className="border-b border-[var(--border)] text-[var(--foreground-soft)] last:border-0 hover:bg-[var(--surface-subtle)]"
                      >
                        <td role="cell"
                          className="px-4 py-3"
                          data-period-type={goal.periodType}
                          data-sort-value={goal.periodNumber}
                        >
                          {goal.periodType === "REG" ? goal.periodNumber : goal.periodType}
                        </td>
                        <td role="cell"
                          className="px-4 py-3 tabular-nums"
                          data-sort-value={gameTime}
                        >
                          {goal.timeInPeriod}
                        </td>
                        <td role="cell" className="px-4 py-3">
                          {goal.ownerTeam ? (
                            <span className="inline-flex items-center gap-2">
                              <TeamLogo {...goal.ownerTeam} size="tiny" decorative />
                              <Link
                                href={`/teams/${goal.ownerTeam.nhlTeamId}?season=${seasonId}`}
                                className="font-medium text-[var(--foreground)] transition hover:text-[var(--accent)]"
                              >
                                {goal.ownerTeam.abbreviation}
                              </Link>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td role="cell" className="px-4 py-3">
                          <span className="workspace-entity-name">
                            <PlayerLink player={scorer} seasonId={seasonId} />
                          </span>
                        </td>
                        <td role="cell" className="px-4 py-3 leading-6">
                          {assists.length > 0 ? (
                            <span className="flex flex-col gap-1">
                              {assists.map((player) => (
                                <PlayerLink
                                  key={`${goal.sourceEventId}-${player.role}`}
                                  player={player}
                                  seasonId={seasonId}
                                />
                              ))}
                            </span>
                          ) : (
                            <span className="text-[var(--muted)]">Unassisted</span>
                          )}
                        </td>
                        <td role="cell"
                          className="whitespace-nowrap px-4 py-3 text-center font-semibold tabular-nums text-[var(--foreground)]"
                          data-sort-value={
                            (goal.awayScore ?? 0) + (goal.homeScore ?? 0)
                          }
                        >
                          {goal.awayScore ?? "—"}–{goal.homeScore ?? "—"}
                        </td>
                        <td role="cell" className="px-4 py-3">
                          {goalTypeLabel(goal, awayTeam, homeTeam)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableScroll>
        </div>
      )}
    </section>
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
    return <span className="text-[var(--muted)]">Unavailable</span>;
  }

  const name = player.name ?? `NHL player ${player.sourcePlayerId}`;
  return player.nhlPlayerId === null ? (
    <span className="text-[var(--muted)]">{name}</span>
  ) : (
    <Link
      href={`/players/${player.nhlPlayerId}?season=${seasonId}`}
      className="text-[var(--foreground-soft)] transition hover:text-[var(--accent)]"
    >
      {name}
    </Link>
  );
}

function playerForRole(
  event: PlayByPlayEvent,
  role: string,
): PlayByPlayPlayer | undefined {
  return event.players.find((player) => player.role === role);
}

function goalTypeLabel(
  goal: PlayByPlayEvent,
  awayTeam: GameTeamSummary,
  homeTeam: GameTeamSummary,
): string {
  const strength = strengthLabel(goal, awayTeam, homeTeam)
    ?.replace(/Power play · .*/, "PP")
    .replace(/Short-handed · .*/, "SH")
    .replace("Empty net", "EN");
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

function humanize(value: string): string {
  return value
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
