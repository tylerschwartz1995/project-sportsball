import Link from "@/components/ui/exploration-link";
import { SortableTable } from "@/components/ui/sortable-table";
import { SortableHeader } from "@/components/ui/sortable-header";
import { TableScroll } from "@/components/ui/table-scroll";
import type { MoneyPuckSeasonUnitStats } from "@/contracts/season-unit";
import { formatDecimal, formatMinutes, formatPercentage } from "@/features/analytics/directory/logic";

const additionalMetrics = [
  { key: "expectedGoalsFor", label: "xGF", description: "Expected goals for", digits: 2 },
  { key: "expectedGoalsAgainst", label: "xGA", description: "Expected goals against", digits: 2 },
  { key: "goalsFor", label: "GF", description: "Goals for", digits: 0 },
  { key: "goalsAgainst", label: "GA", description: "Goals against", digits: 0 },
  { key: "shotDifferential", label: "S DIFF", description: "Shot differential: shots on goal for minus shots on goal against", digits: 0 },
  { key: "shotsOnGoalAgainst", label: "SA", description: "Shots on goal against", digits: 0 },
  { key: "shotAttemptsFor", label: "CF", description: "All shot attempts for, including blocked and missed shots", digits: 0 },
  { key: "shotAttemptsAgainst", label: "CA", description: "All shot attempts against, including blocked and missed shots", digits: 0 },
  { key: "highDangerExpectedGoalsFor", label: "HD xGF", description: "Expected goals from high-danger chances for", digits: 2 },
  { key: "highDangerExpectedGoalsAgainst", label: "HD xGA", description: "Expected goals from high-danger chances against", digits: 2 },
] as const;

export function TeamLinesTable({ title, rows, seasonId }: {
  title: string; rows: MoneyPuckSeasonUnitStats[]; seasonId: number;
}) {
  return <section aria-label={title}>
    {rows.length ? <div className="workspace-data-table-shell">
      <SortableTable defaultSortKey="iceTime">
        <TableScroll>
          <table className="workspace-table workspace-table-semantic mobile-unit-table min-w-[1660px]">
            <colgroup><col style={{ width: "400px" }} /><col span={14} /></colgroup>
            <thead><tr>
              <SortableHeader label="Players" sticky sortKey="players" align="left" defaultDirection="asc" />
              <SortableHeader label="GP" sortKey="games" />
              <SortableHeader label="TOI" sortKey="iceTime" description="Minutes played together at 5-on-5 in this regular season." />
              <SortableHeader label="xG%" sortKey="xg" description="Expected-goal share while this combination plays together at 5-on-5." />
              <SortableHeader label="CF%" sortKey="corsi" description="Share of shot attempts while this combination plays together at 5-on-5." />
              {additionalMetrics.map(metric => <SortableHeader key={metric.key} label={metric.label} sortKey={metric.key} nowrap description={`${metric.description} while this combination plays together at 5-on-5 in this regular season.`} />)}
            </tr></thead>
            <tbody>{[...rows].sort((a, b) => b.iceTimeSeconds - a.iceTimeSeconds).map(row => <tr key={row.unitKey}>
              <td className="workspace-sticky-entity text-left"><div className="overflow-hidden text-ellipsis whitespace-nowrap" title={row.players.map(player => player.name).join(" / ")}>{row.players.map((player, index) => <span key={player.nhlPlayerId}>
                {index > 0 ? <span className="text-[var(--muted)]"> / </span> : null}
                <Link href={`/players/${player.nhlPlayerId}?season=${seasonId}&phase=regular`} title={player.name} aria-label={player.name}>{shortPlayerName(player.name)}</Link>
              </span>)}</div></td>
              <td className="workspace-semantic-number">{row.gamesPlayed}</td>
              <td className="workspace-semantic-number" data-sort-value={row.iceTimeSeconds}>{formatMinutes(row.iceTimeSeconds)}</td>
              <td className="workspace-semantic-number">{formatPercentage(row.expectedGoalsPercentage)}</td>
              <td className="workspace-semantic-number">{formatPercentage(row.corsiPercentage)}</td>
              {additionalMetrics.map(metric => {
                const value = metric.key === "shotDifferential"
                  ? row.shotsOnGoalFor == null || row.shotsOnGoalAgainst == null
                    ? null : row.shotsOnGoalFor - row.shotsOnGoalAgainst
                  : row[metric.key] ?? null;
                return <td key={metric.key} className="workspace-semantic-number" data-sort-value={value ?? undefined}>
                  {metric.key === "shotDifferential" && value !== null && value > 0 ? "+" : ""}{formatDecimal(value, metric.digits)}
                </td>;
              })}
            </tr>)}</tbody>
          </table>
        </TableScroll>
      </SortableTable>
      {rows.length === 500 ? <p className="p-3 text-sm text-[var(--muted)]">Showing up to 500 recorded combinations.</p> : null}
    </div> : <p className="workspace-empty-state">No combinations match this selection.</p>}
  </section>;
}

function shortPlayerName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length ? `${Array.from(first)[0]}. ${rest.join(" ")}` : name;
}
