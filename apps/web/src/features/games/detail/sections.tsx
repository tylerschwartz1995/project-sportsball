import { TableScroll } from "@/components/ui/table-scroll";
import Link from "@/components/ui/exploration-link";
import { SortableHeader } from "@/components/ui/sortable-header";
import { SortableTable } from "@/components/ui/sortable-table";
import {
  DataTableShell,
  SectionHeader,
} from "@/components/ui/ui-primitives";
import {
  type GameBoxScoreTeam,
  type GameGoalieStats,
  type GameSkaterStats,
  type GameSummary
} from "@/contracts/game";
import { TeamGameRecord } from "@/features/teams/team-game-record";
import { TeamLogo } from "@/features/teams/team-logo";
import { formatPlayerPosition } from "@/lib/player-position";
import { formatSavePercentage, formatSigned, formatTimeOnIce } from './logic';

export function ScoreTeam({
  team,
  seasonId,
  align = "left",
}: {
  team: GameSummary["awayTeam"];
  seasonId: number;
  align?: "left" | "right";
}) {
  return (
    <div className="workspace-game-score-team" data-align={align}>
      <div className="workspace-game-score-identity">
        <TeamLogo
          nhlTeamId={team.nhlTeamId}
          abbreviation={team.abbreviation}
          name={team.name}
          size="profile"
          decorative
          prominent
        />
        <div>
          <small>
            {align === "right" ? "Home" : "Away"} · {team.abbreviation}
          </small>
          <div className="workspace-game-score-name">
            <Link
              href={`/teams/${team.nhlTeamId}?season=${seasonId}`}
            >
              {team.name}
            </Link>
          </div>
          <p className="modern-game-support">
            {team.score !== null ? <TeamGameRecord record={team.record} /> : null}
            {team.shotsOnGoal === null
              ? team.score !== null ? "Shots unavailable" : null
              : `${team.shotsOnGoal} shots`}
          </p>
        </div>
      </div>
      <strong>
        {team.score ?? ""}
      </strong>
    </div>
  );
}

export function TeamBoxScore({
  team,
  seasonId,
}: {
  team: GameBoxScoreTeam;
  seasonId: number;
}) {
  return (
    <section>
      <SectionHeader
        eyebrow={`${team.abbreviation} box score`}
        title={team.name}
        action={
          <div className="flex items-center gap-3">
            <TeamLogo
              nhlTeamId={team.nhlTeamId}
              abbreviation={team.abbreviation}
              name={team.name}
              size="compact"
              decorative
              prominent
            />
          </div>
        }
      />

      <h3 className="mt-7 text-lg font-semibold text-[var(--foreground)]">Skaters</h3>
      <SkaterTable
        players={team.skaters}
        seasonId={seasonId}
        team={team}
      />

      <h3 className="mt-8 text-lg font-semibold text-[var(--foreground)]">Goalies</h3>
      <GoalieTable
        players={team.goalies}
        seasonId={seasonId}
        team={team}
      />
    </section>
  );
}

export function SkaterTable({
  players,
  seasonId,
  team,
}: {
  players: GameSkaterStats[];
  seasonId: number;
  team: GameBoxScoreTeam;
}) {
  return (
    <DataTableShell>
      <SortableTable secondaryColumns={[5, 7, 8, 9]} defaultSortKey="points">
        <TableScroll className="workspace-table-scroll">
          <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[940px]">
            <colgroup>
              <col className="workspace-col-entity" />
              <col className="workspace-col-stat" span={8} />
              <col className="workspace-col-time" />
            </colgroup>
            <caption className="sr-only">{team.name} skater box score</caption>
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-left text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
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
                  className="border-b border-[var(--border)] text-[var(--foreground-soft)] last:border-0 hover:bg-[var(--surface-subtle)]"
                >
                  <td className="px-4 py-3">
                    <div>
                      <Link
                        href={`/players/${player.nhlPlayerId}?season=${seasonId}`}
                        className="workspace-entity-name font-medium text-[var(--foreground)] transition hover:text-[var(--accent)]"
                      >
                        {player.name}
                      </Link>
                      <span className="ml-2 text-xs text-[var(--muted)]">
                        {player.sweaterNumber === null
                          ? ""
                          : `#${player.sweaterNumber} · `}
                        {formatPlayerPosition(player.position)}
                      </span>
                    </div>
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
        </TableScroll>
      </SortableTable>
    </DataTableShell>
  );
}

export function GoalieTable({
  players,
  seasonId,
  team,
}: {
  players: GameGoalieStats[];
  seasonId: number;
  team: GameBoxScoreTeam;
}) {
  return (
    <DataTableShell>
      <SortableTable secondaryColumns={[7, 8]} defaultSortKey="shotsAgainst">
        <TableScroll className="workspace-table-scroll">
          <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[900px]">
            <colgroup>
              <col className="workspace-col-entity" />
              <col className="workspace-col-stat" span={4} />
              <col className="workspace-col-percentage" />
              <col className="workspace-col-split" span={2} />
              <col className="workspace-col-time" />
            </colgroup>
            <caption className="sr-only">{team.name} goalie box score</caption>
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-left text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                <SortableHeader label="Goalie" sortKey="goalie" align="left" defaultDirection="asc" />
                <SortableHeader label="DEC" sortKey="decision" defaultDirection="asc" />
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
                  className="border-b border-[var(--border)] text-[var(--foreground-soft)] last:border-0 hover:bg-[var(--surface-subtle)]"
                >
                  <td className="px-4 py-3">
                    <div>
                      <Link
                        href={`/players/${player.nhlPlayerId}?season=${seasonId}`}
                        className="workspace-entity-name font-medium text-[var(--foreground)] transition hover:text-[var(--accent)]"
                      >
                        {player.name}
                      </Link>
                      <span className="ml-2 text-xs text-[var(--muted)]">
                        {player.starter ? "Starter" : "Backup"}
                      </span>
                    </div>
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
        </TableScroll>
      </SortableTable>
    </DataTableShell>
  );
}

export function NumericCell({
  value,
  highlight = false,
}: {
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <td
      className={`workspace-semantic-number px-3 py-3 text-center tabular-nums ${highlight ? "font-semibold text-[var(--accent)]" : "text-[var(--foreground-soft)]"
        }`}
    >
      {value}
    </td>
  );
}
