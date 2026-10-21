import { perSixty } from "@/lib/per-sixty";
import { TeamTableLink } from "@/features/teams/team-table-link";
import { SortableHeader } from "@/components/ui/sortable-header";
import type {
  AdvancedTeamLeaderboardRow
} from "@/contracts/advanced-leaderboard";
import { formatDecimal, formatPercentage } from '../logic';
import { ValueCell } from './cells';
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
      <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[1100px]">
        <colgroup>
          <col className="workspace-col-entity" />
          <col className="workspace-col-number" />
          <col className="workspace-col-percentage" span={2} />
          <col className="workspace-col-number" span={2} />
          <col className="workspace-col-percentage" />
          <col className="workspace-col-number" span={2} />
          <col className="workspace-col-percentage" />
        </colgroup>
        <thead>
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
              label="xGF/60"
              sortKey="xGoalsFor"
              metricGroup="shot-quality"
            />
            <SortableHeader
              label="xGA/60"
              sortKey="xGoalsAgainst"
              defaultDirection="asc"
              metricGroup="shot-quality"
            />
            <SortableHeader
              label="xG%"
              sortKey="xgPercentage"
              metricGroup="core possession"
            />
            <SortableHeader label="HD xGF/60" sortKey="hdXgf" nowrap />
            <SortableHeader label="HD xGA/60" sortKey="hdXga" nowrap defaultDirection="asc" />
            <SortableHeader label="HD xG%" sortKey="hdXgPercentage" nowrap />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.team.nhlTeamId}
              className="border-b border-[var(--border)] text-[var(--foreground-soft)] last:border-0 hover:bg-[var(--surface-subtle)]"
            >
              <td className="workspace-sticky-entity px-4 py-3 text-left" data-column-group="core possession shot-quality results">
                <TeamTableLink
                  team={row.team}
                  href={`/teams/${row.team.nhlTeamId}?season=${seasonId}&phase=${phase}`}
                />
              </td>
              <ValueCell
                value={String(row.gamesPlayed)}
                metricGroup="core possession shot-quality results"
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
                value={formatDecimal(perSixty(row.expectedGoalsFor, row.iceTimeSeconds))}
                metricGroup="shot-quality"
              />
              <ValueCell
                value={formatDecimal(perSixty(row.expectedGoalsAgainst, row.iceTimeSeconds))}
                metricGroup="shot-quality"
              />
              <ValueCell
                value={formatPercentage(row.expectedGoalsPercentage)}
                highlight
                metricGroup="core possession"
              />
              <ValueCell value={formatDecimal(perSixty(row.highDangerExpectedGoalsFor, row.iceTimeSeconds))} />
              <ValueCell value={formatDecimal(perSixty(row.highDangerExpectedGoalsAgainst, row.iceTimeSeconds))} />
              <ValueCell value={formatPercentage(row.highDangerExpectedGoalsPercentage ?? null)} />
            </tr>
          ))}
        </tbody>
      </table>
    </LeaderboardFrame>
  );
}
