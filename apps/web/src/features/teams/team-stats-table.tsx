import { TeamTableLink } from "@/features/teams/team-table-link";
import { SortableTable } from "@/components/ui/sortable-table";
import { SortableHeader } from "@/components/ui/sortable-header";
import { TableScroll } from "@/components/ui/table-scroll";
import type { TeamSeasonSummary } from "@/contracts/team";
import type { SeasonPhase } from "@/contracts/season-phase";

export function TeamStatsTable({ rows, seasonId, phase }: { rows: TeamSeasonSummary[]; seasonId: number; phase: SeasonPhase }) {
  const columns = ["GP", "W", "L", ...(phase === "regular" ? ["OTL", "PTS"] : []), "GF", "GA", "DIFF", "PP%", "PK%"];
  return <div className="workspace-data-table-shell mt-6"><SortableTable defaultSortKey={phase === "regular" ? "PTS" : "W"}><TableScroll className="overflow-x-auto">
    <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[940px]">
      <colgroup><col className="workspace-col-entity" /><col className="workspace-col-stat" span={columns.length} /></colgroup>
      <thead><tr><SortableHeader label="Team" sortKey="team" sticky align="left" defaultDirection="asc" />{columns.map(label => <SortableHeader key={label} label={label} sortKey={label} />)}</tr></thead>
      <tbody>{rows.map(({ team, stats }) => <tr key={team.nhlTeamId}>
        <td className="workspace-sticky-entity px-4 py-3"><TeamTableLink team={team} href={`/teams/${team.nhlTeamId}?season=${seasonId}&phase=${phase}`} /></td>
        {[stats.gamesPlayed, stats.wins, phase === "regular" ? stats.regulationLosses : stats.losses,
          ...(phase === "regular" ? [stats.overtimeLosses + stats.shootoutLosses, stats.standingsPoints] : []),
          stats.goalsFor, stats.goalsAgainst, stats.goalsFor - stats.goalsAgainst,
          formatSpecialTeamsPercentage(stats.powerPlayPercentage), formatSpecialTeamsPercentage(stats.penaltyKillPercentage)].map((value, i) => <td key={columns[i]} className="px-4 py-3 text-right tabular-nums">{value}</td>)}
      </tr>)}</tbody>
    </table>
  </TableScroll></SortableTable></div>;
}

function formatSpecialTeamsPercentage(value: number | null | undefined) {
  return value == null ? "—" : `${(value * 100).toFixed(1)}%`;
}
