import { goalieGoalsSavedPer60 } from "@/lib/advanced-table";
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
      defaultSortKey="pointsPer60"
    >
      <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[1200px]">
        <colgroup>
          <col className="workspace-col-entity" />
          <col className="workspace-col-number" />
          <col className="workspace-col-time" />
          <col className="workspace-col-number" span={7} />
        </colgroup>
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
            <SortableHeader label="Player" sortKey="player" align="left" defaultDirection="asc" sticky metricGroup="core possession shot-quality results" />
            <SortableHeader label="GP" sortKey="games" metricGroup="core possession shot-quality results" />
            <SortableHeader label="TOI" sortKey="iceTime" metricGroup="core possession shot-quality results" />
            <SortableHeader label="P/60" sortKey="pointsPer60" nowrap description="The player's own goals and assists per 60 minutes in the selected situation." />
            <SortableHeader label="ixG/60" sortKey="individualXGoalsPer60" nowrap description="Expected goals from the player's own chances per 60 minutes in the selected situation." />
            <SortableHeader label="CF%" sortKey="corsiPercentage" description="Team shot-attempt share while this player is on the ice in the selected situation." />
            <SortableHeader label="xGF/60" sortKey="onIceXGoalsForPer60" nowrap description="Team expected goals created per 60 minutes while this player is on the ice in the selected situation." />
            <SortableHeader label="xGA/60" sortKey="onIceXGoalsAgainstPer60" nowrap defaultDirection="asc" description="Team expected goals allowed per 60 minutes while this player is on the ice in the selected situation." />
            <SortableHeader label="xG%" sortKey="xgPercentage" description="Team expected-goal share while this player is on the ice in the selected situation." />
            <SortableHeader label="HD xG%" sortKey="hdXgPercentage" nowrap description="Team share of high-danger expected goals while this player is on the ice in the selected situation." />
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
              <ValueCell value={formatDecimal(row.pointsPer60 ?? null)} highlight />
              <ValueCell value={formatDecimal(row.individualExpectedGoalsPer60 ?? null)} />
              <ValueCell value={formatPercentage(row.onIceCorsiPercentage)} />
              <ValueCell value={formatDecimal(row.onIceExpectedGoalsForPer60 ?? null)} />
              <ValueCell value={formatDecimal(row.onIceExpectedGoalsAgainstPer60 ?? null)} />
              <ValueCell value={formatPercentage(row.onIceExpectedGoalsPercentage)} />
              <ValueCell value={formatPercentage(row.onIceHighDangerExpectedGoalsPercentage ?? null)} />
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
      defaultSortKey="goalsSavedPer60"
    >
      <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[1200px]">
        <colgroup>
          <col className="workspace-col-entity" />
          <col className="workspace-col-number" />
          <col className="workspace-col-time" />
          <col className="workspace-col-number" span={6} />
        </colgroup>
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
            <SortableHeader label="Goalie" sortKey="goalie" align="left" defaultDirection="asc" sticky metricGroup="core shot-quality results" />
            <SortableHeader label="GP" sortKey="games" metricGroup="core shot-quality results" />
            <SortableHeader label="TOI" sortKey="iceTime" metricGroup="core shot-quality results" />
            <SortableHeader label="GSAx/60" sortKey="goalsSavedPer60" nowrap description="Expected goals against minus goals allowed, per 60 minutes in the selected situation. Higher is better." />
            <SortableHeader label="xGA/60" sortKey="goalieXGoalsAgainstPer60" nowrap description="Expected goals faced per 60 minutes in the selected situation; measures workload and chance quality." />
            <SortableHeader label="HD GSAx" sortKey="highDangerGoalsSaved" nowrap description="High-danger expected goals against minus high-danger goals allowed in the selected situation. Season total; higher is better." />
            <SortableHeader label="MD GSAx" sortKey="mediumDangerGoalsSaved" nowrap description="Medium-danger expected goals against minus medium-danger goals allowed in the selected situation. Season total; higher is better." />
            <SortableHeader label="LD GSAx" sortKey="lowDangerGoalsSaved" nowrap description="Low-danger expected goals against minus low-danger goals allowed in the selected situation. Season total; higher is better." />
            <SortableHeader label="Rebounds/60" sortKey="reboundsPer60" nowrap defaultDirection="asc" description="Rebounds allowed per 60 minutes in the selected situation. This depends on workload as well as rebound control." />
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
                detail="G"
                team={row.team}
                metricGroup="core shot-quality results"
              />
              <ValueCell value={String(row.gamesPlayed)} metricGroup="core shot-quality results" />
              <ValueCell value={formatMinutes(row.iceTimeSeconds)} metricGroup="core shot-quality results" />
              <ValueCell value={formatSignedDecimal(goalieGoalsSavedPer60(row))} />
              <ValueCell value={formatDecimal(row.expectedGoalsAgainstPer60 ?? null)} />
              <ValueCell value={formatSignedDecimal(row.highDangerGoalsSavedAboveExpected ?? null)} />
              <ValueCell value={formatSignedDecimal(row.mediumDangerGoalsSavedAboveExpected ?? null)} />
              <ValueCell value={formatSignedDecimal(row.lowDangerGoalsSavedAboveExpected ?? null)} />
              <ValueCell value={formatDecimal(row.reboundsPer60 ?? null)} />
            </tr>
          ))}
        </tbody>
      </table>
    </LeaderboardFrame>
  );
}
