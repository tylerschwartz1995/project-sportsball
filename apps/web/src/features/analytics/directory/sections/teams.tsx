import { SortableHeader } from "@/components/ui/sortable-header";
import type {
  AdvancedTeamLeaderboardRow
} from "@/contracts/advanced-leaderboard";
import { formatDecimal, formatMinutes, formatPercentage } from '../logic';
import { EntityCell, ValueCell } from './cells';
import { LeaderboardFrame } from './table';
export function TeamLeaderboard({
  rows,
  seasonId,
  phase,
}: {
  rows: AdvancedTeamLeaderboardRow[];
  seasonId: number;
  phase: "regular" | "playoffs";
}) {
  return (
    <LeaderboardFrame
      count={rows.length}
      description="Team results"
      defaultSortKey="xgPercentage"
    >
      <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[920px]">
        <colgroup>
          <col className="workspace-col-entity" />
          <col className="workspace-col-number" />
          <col className="workspace-col-time" />
          <col className="workspace-col-percentage" />
          <col className="workspace-col-percentage" span={2} />
          <col className="workspace-col-number" span={2} />
          <col className="workspace-col-number" span={2} />
        </colgroup>
        <thead>
          <tr className="ux-metric-groups">
            <th colSpan={3} scope="colgroup">
              Team & Workload
            </th>
            <th colSpan={3} scope="colgroup">
              Share of Play
            </th>
            <th colSpan={2} scope="colgroup">
              Expected Goals
            </th>
            <th colSpan={2} scope="colgroup">
              Actual Goals
            </th>
          </tr>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
            <SortableHeader
              label="Team"
              sortKey="team"
              align="left"
              defaultDirection="asc"
              sticky
              metricGroup="core possession shot-quality results"
            />
            <SortableHeader
              label="GP"
              sortKey="games"
              metricGroup="core possession shot-quality results"
            />
            <SortableHeader
              label="TOI"
              sortKey="iceTime"
              metricGroup="core possession shot-quality results"
            />
            <SortableHeader
              label="xG%"
              sortKey="xgPercentage"
              metricGroup="core possession"
            />
            <SortableHeader
              label="CF%"
              sortKey="corsiPercentage"
              metricGroup="possession"
            />
            <SortableHeader
              label="FF%"
              sortKey="fenwickPercentage"
              metricGroup="possession"
            />
            <SortableHeader
              label="xGF"
              sortKey="xGoalsFor"
              metricGroup="shot-quality"
            />
            <SortableHeader
              label="xGA"
              sortKey="xGoalsAgainst"
              defaultDirection="asc"
              metricGroup="shot-quality"
            />
            <SortableHeader
              label="GF"
              sortKey="goalsFor"
              metricGroup="results"
            />
            <SortableHeader
              label="GA"
              sortKey="goalsAgainst"
              defaultDirection="asc"
              metricGroup="results"
            />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.team.nhlTeamId}
              className="border-b border-[var(--border)] text-[var(--foreground-soft)] last:border-0 hover:bg-[var(--surface-subtle)]"
            >
              <EntityCell
                href={`/teams/${row.team.nhlTeamId}?season=${seasonId}&phase=${phase}`}
                name={row.team.name}
                detail={row.team.abbreviation}
                team={row.team}
                metricGroup="core possession shot-quality results"
              />
              <ValueCell
                value={String(row.gamesPlayed)}
                metricGroup="core possession shot-quality results"
              />
              <ValueCell
                value={formatMinutes(row.iceTimeSeconds)}
                metricGroup="core possession shot-quality results"
              />
              <ValueCell
                value={formatPercentage(row.expectedGoalsPercentage)}
                highlight
                metricGroup="core possession"
              />
              <ValueCell
                value={formatPercentage(row.corsiPercentage)}
                metricGroup="possession"
              />
              <ValueCell
                value={formatPercentage(row.fenwickPercentage)}
                metricGroup="possession"
              />
              <ValueCell
                value={formatDecimal(row.expectedGoalsFor)}
                metricGroup="shot-quality"
              />
              <ValueCell
                value={formatDecimal(row.expectedGoalsAgainst)}
                metricGroup="shot-quality"
              />
              <ValueCell
                value={formatDecimal(row.goalsFor, 0)}
                metricGroup="results"
              />
              <ValueCell
                value={formatDecimal(row.goalsAgainst, 0)}
                metricGroup="results"
              />
            </tr>
          ))}
        </tbody>
      </table>
    </LeaderboardFrame>
  );
}
