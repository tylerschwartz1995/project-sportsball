import { TableScroll } from "@/components/ui/table-scroll";
import Link from "@/components/ui/exploration-link";
import type { CareerSeason } from "@/data/player-career";
import { SortableHeader } from "@/components/ui/sortable-header";
import { SortableTable } from "@/components/ui/sortable-table";

export function PlayerCareer({ rows, playerId, phase, selectedSeason }: {
  rows: CareerSeason[]; playerId: number; phase: string; selectedSeason?: number;
}) {
  const gameType = phase === "playoffs" ? 3 : 2;
  const filtered = rows.filter(row => row.gameType === gameType && (!selectedSeason || row.seasonId === selectedSeason));
  if (!filtered.length) return <p className="workspace-empty-state">No {phase === "playoffs" ? "playoff" : "regular-season"} summary is available for this selection.</p>;
  const goalie = filtered[0].kind === "goalie";
  const columns = goalie ? ["GP", "W", "SV%"] : ["GP", "G", "A", "PTS"];
  const values = (row: CareerSeason) => goalie
    ? [row.games, row.wins, row.saves !== null && row.shotsAgainst ? row.saves / row.shotsAgainst : null]
    : [row.games, row.goals, row.assists, row.points];
  const totals = columns.map((_, index) => {
    if (goalie && index === 2) {
      if (filtered.some(row => row.saves === null || row.shotsAgainst === null)) return null;
      const shots = filtered.reduce((sum, row) => sum + (row.shotsAgainst ?? 0), 0);
      return shots ? filtered.reduce((sum, row) => sum + (row.saves ?? 0), 0) / shots : null;
    }
    if (filtered.some(row => values(row)[index] === null)) return null;
    return filtered.reduce((sum, row) => sum + (values(row)[index] ?? 0), 0);
  });
  const format = (value: number | null, index: number) => value === null ? "—" : goalie && index === 2 ? value.toFixed(3).replace(/^0/, "") : value;
  return <section className="workspace-width-standard mt-8">
    <h2 className="text-xl font-semibold">{selectedSeason ? "Season Totals" : "Career Seasons"}</h2>
    <div className="data-table-shell mt-4"><SortableTable defaultSortKey="season" defaultDirection="desc">
      <TableScroll className="workspace-table-scroll"><table className="workspace-table workspace-table-dense">
        <thead><tr><SortableHeader label="Season" sortKey="season" align="left" /><th>Teams</th>{columns.map(label => <SortableHeader key={label} label={label} sortKey={label} />)}</tr></thead>
        <tbody>{filtered.map(row => <tr key={`${row.kind}-${row.seasonId}`}>
          <td data-sort-value={row.seasonId}><Link href={`/players/${playerId}?season=${row.seasonId}&phase=${phase}`}>{Math.floor(row.seasonId / 10000)}–{String(row.seasonId % 10000).slice(-2)}</Link></td>
          <td>{row.teams ?? "—"}</td>{values(row).map((value, index) => <td className="tabular-nums" data-sort-value={value ?? ""} key={index}>{format(value, index)}</td>)}
        </tr>)}</tbody>
        {!selectedSeason ? <tfoot><tr><th scope="row" colSpan={2}>Career Total</th>{totals.map((value, index) => <td className="tabular-nums" data-sort-value={value ?? ""} key={index}>{format(value, index)}</td>)}</tr></tfoot> : null}
      </table></TableScroll>
    </SortableTable></div>
    <p className="mt-3 text-sm text-[var(--muted)]">NHL season summaries · {phase === "playoffs" ? "Playoffs" : "Regular season"}. Multi-team seasons use combined totals. Missing historical fields remain unavailable.</p>
  </section>;
}
