import Link from "@/components/ui/exploration-link";
import { SortableTable } from "@/components/ui/sortable-table";
import { SortableHeader } from "@/components/ui/sortable-header";
import { TableScroll } from "@/components/ui/table-scroll";
import type { TeamSeasonSummary } from "@/contracts/team";
import type { SeasonPhase } from "@/contracts/season-phase";

export function TeamStatsTable({ rows, seasonId, phase }: { rows: TeamSeasonSummary[]; seasonId: number; phase: SeasonPhase }) {
  const columns = ["GP", "W", "L", ...(phase === "regular" ? ["OTL", "PTS"] : []), "GF", "GA", "DIFF"];
  return <div className="workspace-data-table-shell mt-6"><SortableTable defaultSortKey={phase === "regular" ? "PTS" : "W"}><TableScroll className="overflow-x-auto">
    <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[680px]">
      <colgroup><col className="workspace-col-entity" /><col className="workspace-col-stat" span={columns.length} /></colgroup>
      <thead><tr><SortableHeader label="Team" sortKey="team" align="left" defaultDirection="asc" />{columns.map(label => <SortableHeader key={label} label={label} sortKey={label} />)}</tr></thead>
      <tbody>{rows.map(({ team, stats }) => <tr key={team.nhlTeamId}>
        <td className="px-4 py-3"><Link href={`/teams/${team.nhlTeamId}?season=${seasonId}&phase=${phase}`}>{team.name}</Link></td>
        {[stats.gamesPlayed, stats.wins, phase === "regular" ? stats.regulationLosses : stats.losses,
          ...(phase === "regular" ? [stats.overtimeLosses + stats.shootoutLosses, stats.standingsPoints] : []),
          stats.goalsFor, stats.goalsAgainst, stats.goalsFor - stats.goalsAgainst].map((value, i) => <td key={columns[i]} className="px-4 py-3 text-right tabular-nums">{value}</td>)}
      </tr>)}</tbody>
    </table>
  </TableScroll></SortableTable></div>;
}
