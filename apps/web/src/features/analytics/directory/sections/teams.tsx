import { perSixty } from "@/lib/per-sixty";
import { TeamTableLink } from "@/features/teams/team-table-link";
import { SortableHeader } from "@/components/ui/sortable-header";
import type { AdvancedTeamLeaderboardRow } from "@/contracts/advanced-leaderboard";
import { formatDecimal, formatPercentage } from '../logic';
import { ValueCell } from './cells';
import { LeaderboardFrame } from './table';

export function TeamLeaderboard({ rows, seasonId, phase }: {
  rows: AdvancedTeamLeaderboardRow[];
  seasonId: number;
  phase: "regular" | "playoffs";
}) {
  return (
    <LeaderboardFrame count={rows.length} description="Team results" defaultSortKey="xgPercentage">
      <table className="workspace-table workspace-table-dense workspace-table-semantic reference-team-advanced-table min-w-[900px]">
        <colgroup>
          <col className="workspace-col-entity" />
          <col className="workspace-col-stat" span={8} />
        </colgroup>
        <thead>
          <tr>
            <SortableHeader label="Team" sortKey="team" align="left" defaultDirection="asc" sticky />
            <SortableHeader label="GP" sortKey="games" />
            <SortableHeader label="xGF/60" sortKey="xGoalsFor" nowrap />
            <SortableHeader label="xGA/60" sortKey="xGoalsAgainst" defaultDirection="asc" nowrap />
            <SortableHeader label="xG%" sortKey="xgPercentage" />
            <SortableHeader label="CF%" sortKey="corsiPercentage" />
            <SortableHeader label="FF%" sortKey="fenwickPercentage" />
            <SortableHeader label="HD xG%" sortKey="hdXgPercentage" nowrap />
            <SortableHeader label="PDO" sortKey="pdo" description="Shooting percentage plus save percentage in the selected situation, on a scale centred on 100." />
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.team.nhlTeamId}>
              <td className="workspace-sticky-entity px-4 py-3 text-left">
                <TeamTableLink team={row.team} href={`/teams/${row.team.nhlTeamId}?season=${seasonId}&phase=${phase}`} />
              </td>
              <ValueCell value={String(row.gamesPlayed)} />
              <ValueCell value={formatDecimal(perSixty(row.expectedGoalsFor, row.iceTimeSeconds))} />
              <ValueCell value={formatDecimal(perSixty(row.expectedGoalsAgainst, row.iceTimeSeconds))} />
              <ValueCell value={formatPercentage(row.expectedGoalsPercentage)} />
              <ValueCell value={formatPercentage(row.corsiPercentage)} />
              <ValueCell value={formatPercentage(row.fenwickPercentage)} />
              <ValueCell value={formatPercentage(row.highDangerExpectedGoalsPercentage ?? null)} />
              <ValueCell value={formatDecimal(row.pdo ?? null)} />
            </tr>
          ))}
        </tbody>
      </table>
    </LeaderboardFrame>
  );
}
