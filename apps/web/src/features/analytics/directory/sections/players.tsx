import { SortableHeader } from "@/components/ui/sortable-header";
import type {
  AdvancedGoalieLeaderboardRow,
  AdvancedSkaterLeaderboardRow
} from "@/contracts/advanced-leaderboard";
import { formatPlayerPosition } from "@/lib/player-position";
import { formatDecimal, formatMinutes, formatPercentage, formatSignedDecimal } from '../logic';
import { EntityCell, ValueCell } from './cells';
import { LeaderboardFrame } from './table';
export function SkaterLeaderboard({
  rows,
  seasonId,
}: {
  rows: AdvancedSkaterLeaderboardRow[];
  seasonId: number;
}) {
  return (
    <LeaderboardFrame
      count={rows.length}
      description="Player results"
      defaultSortKey="gameScore"
    >
      <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[980px]">
        <colgroup>
          <col className="workspace-col-entity" />
          <col className="workspace-col-number" />
          <col className="workspace-col-time" />
          <col className="workspace-col-split" />
          <col className="workspace-col-percentage" span={2} />
          <col className="workspace-col-number" />
          <col className="workspace-col-number" span={2} />
        </colgroup>
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
            <SortableHeader label="Player" sortKey="player" align="left" defaultDirection="asc" sticky metricGroup="core possession shot-quality results" />
            <SortableHeader label="GP" sortKey="games" metricGroup="core possession shot-quality results" />
            <SortableHeader label="TOI" sortKey="iceTime" metricGroup="core possession shot-quality results" />
            <SortableHeader label="Game score" sortKey="gameScore" metricGroup="core results" />
            <SortableHeader label="xG%" sortKey="xgPercentage" metricGroup="possession" />
            <SortableHeader label="CF%" sortKey="corsiPercentage" metricGroup="possession" />
            <SortableHeader label="ixG" sortKey="individualXGoals" metricGroup="core shot-quality" />
            <SortableHeader label="Goals" sortKey="goals" metricGroup="results" />
            <SortableHeader label="Points" sortKey="points" metricGroup="results" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.player.nhlPlayerId}-${row.team.nhlTeamId}`}
              className="border-b border-[var(--border)] text-[var(--foreground-soft)] last:border-0 hover:bg-[var(--surface-subtle)]"
            >
              <EntityCell
                href={`/players/${row.player.nhlPlayerId}?season=${seasonId}`}
                name={row.player.name}
                detail={formatPlayerPosition(row.player.position, "Skater")}
                team={row.team}
                metricGroup="core possession shot-quality results"
              />
              <ValueCell value={String(row.gamesPlayed)} metricGroup="core possession shot-quality results" />
              <ValueCell value={formatMinutes(row.iceTimeSeconds)} metricGroup="core possession shot-quality results" />
              <ValueCell value={formatDecimal(row.gameScore)} highlight metricGroup="core results" />
              <ValueCell value={formatPercentage(row.onIceExpectedGoalsPercentage)} metricGroup="possession" />
              <ValueCell value={formatPercentage(row.onIceCorsiPercentage)} metricGroup="possession" />
              <ValueCell value={formatDecimal(row.individualExpectedGoals)} metricGroup="core shot-quality" />
              <ValueCell value={formatDecimal(row.individualGoals, 0)} metricGroup="results" />
              <ValueCell value={formatDecimal(row.individualPoints, 0)} metricGroup="results" />
            </tr>
          ))}
        </tbody>
      </table>
    </LeaderboardFrame>
  );
}

export function GoalieLeaderboard({
  rows,
  seasonId,
}: {
  rows: AdvancedGoalieLeaderboardRow[];
  seasonId: number;
}) {
  return (
    <LeaderboardFrame
      count={rows.length}
      description="Goalie results"
      defaultSortKey="goalsSaved"
    >
      <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[860px]">
        <colgroup>
          <col className="workspace-col-entity" />
          <col className="workspace-col-number" />
          <col className="workspace-col-time" />
          <col className="workspace-col-differential" />
          <col className="workspace-col-number" />
          <col className="workspace-col-number" />
          <col className="workspace-col-split" />
          <col className="workspace-col-number" />
        </colgroup>
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
            <SortableHeader label="Goalie" sortKey="goalie" align="left" defaultDirection="asc" sticky metricGroup="core shot-quality results" />
            <SortableHeader label="GP" sortKey="games" metricGroup="core shot-quality results" />
            <SortableHeader label="TOI" sortKey="iceTime" metricGroup="core shot-quality results" />
            <SortableHeader label="GSAx" sortKey="goalsSaved" metricGroup="core shot-quality results" />
            <SortableHeader label="xGA" sortKey="xGoalsAgainst" metricGroup="shot-quality" />
            <SortableHeader label="GA" sortKey="goalsAgainst" defaultDirection="asc" metricGroup="results" />
            <SortableHeader label="Expected SOG" sortKey="expectedShots" metricGroup="shot-quality" />
            <SortableHeader label="SOG" sortKey="shots" metricGroup="results" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.player.nhlPlayerId}-${row.team.nhlTeamId}`}
              className="border-b border-[var(--border)] text-[var(--foreground-soft)] last:border-0 hover:bg-[var(--surface-subtle)]"
            >
              <EntityCell
                href={`/players/${row.player.nhlPlayerId}?season=${seasonId}`}
                name={row.player.name}
                detail="Goalie"
                team={row.team}
                metricGroup="core shot-quality results"
              />
              <ValueCell value={String(row.gamesPlayed)} metricGroup="core shot-quality results" />
              <ValueCell value={formatMinutes(row.iceTimeSeconds)} metricGroup="core shot-quality results" />
              <ValueCell value={formatSignedDecimal(row.goalsSavedAboveExpected)} highlight metricGroup="core shot-quality results" />
              <ValueCell value={formatDecimal(row.expectedGoalsAgainst)} metricGroup="shot-quality" />
              <ValueCell value={formatDecimal(row.goalsAgainst, 0)} metricGroup="results" />
              <ValueCell value={formatDecimal(row.expectedShotsOnGoalAgainst)} metricGroup="shot-quality" />
              <ValueCell value={formatDecimal(row.shotsOnGoalAgainst, 0)} metricGroup="results" />
            </tr>
          ))}
        </tbody>
      </table>
    </LeaderboardFrame>
  );
}
