import { TableScroll } from "@/components/ui/table-scroll";
import type { CareerSeason } from "@/data/player-career";
import { SortableHeader } from "@/components/ui/sortable-header";
import { SortableTable } from "@/components/ui/sortable-table";

type Column = { key: keyof CareerSeason; label: string; format?: "decimal" | "save" | "percent"; advanced?: boolean; description?: string };
const skaterColumns: Column[] = [
  { key: "games", label: "GP" }, { key: "goals", label: "G" },
  { key: "assists", label: "A" }, { key: "points", label: "PTS" },
  { key: "plusMinus", label: "+/−" }, { key: "shots", label: "Shots" },
  { key: "powerPlayPoints", label: "PPP" }, { key: "hits", label: "Hits" },
  { key: "penaltyMinutes", label: "PIM" },
  { key: "pointsPer60", label: "P/60", format: "decimal", advanced: true, description: "Goals and assists per 60 minutes at 5-on-5. Regular-season MoneyPuck coverage only." },
  { key: "individualXGoalsPer60", label: "ixG/60", format: "decimal", description: "Individual expected goals per 60 minutes at 5-on-5. Regular-season MoneyPuck coverage only." },
  { key: "xGoalsPercentage", label: "xG%", format: "percent", description: "Team expected-goal share while on the ice at 5-on-5. Regular-season MoneyPuck coverage only." },
];
const goalieColumns: Column[] = [
  { key: "games", label: "GP" }, { key: "wins", label: "W" },
  { key: "losses", label: "L" }, { key: "overtimeLosses", label: "OTL" },
  { key: "savePercentage", label: "SV%", format: "save" },
  { key: "goalsAgainstAverage", label: "GAA", format: "decimal" },
  { key: "shutouts", label: "SO" },
  { key: "goalsSavedPer60", label: "GSAx/60", format: "decimal", advanced: true, description: "Expected goals against minus goals allowed per 60 minutes, all situations. Regular-season MoneyPuck coverage only." },
  { key: "xGoalsAgainstPer60", label: "xGA/60", format: "decimal", description: "Expected goals faced per 60 minutes, all situations. Regular-season MoneyPuck coverage only." },
];
function valueFor(row: CareerSeason, column: Column): number | null {
  if (column.key === "savePercentage") return row.savePercentage ?? (row.saves !== null && row.shotsAgainst ? row.saves / row.shotsAgainst : null);
  const value = row[column.key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function format(value: number | null, column: Column) {
  if (value === null) return "—";
  if (column.format === "save") return value.toFixed(3).replace(/^0/, "");
  if (column.format === "percent") return `${(value * 100).toFixed(1)}%`;
  if (column.format === "decimal") return value.toFixed(2);
  if (column.key === "plusMinus" && value > 0) return `+${value}`;
  return String(value);
}
function careerTotal(rows: CareerSeason[], key: keyof CareerSeason): number | null {
  const sum = (field: keyof CareerSeason): number | null => {
    const values = rows.map(row => row[field]);
    if (values.some(value => typeof value !== "number" || !Number.isFinite(value))) return null;
    return (values as number[]).reduce((total, value) => total + value, 0);
  };
  const ratio = (numerator: number | null, denominator: number | null, scale = 1) =>
    numerator === null || denominator === null || denominator <= 0 ? null : numerator * scale / denominator;
  if (key === "savePercentage") return ratio(sum("saves"), sum("shotsAgainst"));
  if (key === "goalsAgainstAverage") return ratio(sum("goalsAgainst"), sum("timeOnIceSeconds"), 3600);
  if (key === "pointsPer60") return ratio(sum("advancedPoints"), sum("advancedSeconds"), 3600);
  if (key === "individualXGoalsPer60") return ratio(sum("advancedIndividualXGoals"), sum("advancedSeconds"), 3600);
  if (key === "xGoalsAgainstPer60") return ratio(sum("advancedXGoalsAgainst"), sum("advancedSeconds"), 3600);
  if (key === "goalsSavedPer60") {
    const expected = sum("advancedXGoalsAgainst"), actual = sum("advancedGoalsAgainst");
    return ratio(expected === null || actual === null ? null : expected - actual, sum("advancedSeconds"), 3600);
  }
  if (key === "xGoalsPercentage") {
    const forGoals = sum("advancedXGoalsFor"), againstGoals = sum("advancedXGoalsAgainst");
    return ratio(forGoals, forGoals === null || againstGoals === null ? null : forGoals + againstGoals);
  }
  return sum(key);
}
export function PlayerCareer({ rows, phase }: { rows: CareerSeason[]; phase: string }) {
  const filtered = rows.filter(row => row.gameType === (phase === "playoffs" ? 3 : 2));
  if (!filtered.length) return <p className="workspace-empty-state mt-8">No {phase === "playoffs" ? "playoff" : "regular-season"} statistics available.</p>;
  const columns = filtered[0].kind === "goalie" ? goalieColumns : skaterColumns;
  return <section className="mt-6 min-w-0" aria-label="Player season history">
    <div className="data-table-shell"><SortableTable defaultSortKey="season" defaultDirection="desc">
      <TableScroll className="workspace-table-scroll"><table className={`workspace-table workspace-table-dense reference-player-career ${filtered[0].kind === "goalie" ? "is-goalie" : "is-skater"}`}>
        <thead><tr>
          <SortableHeader label="Season" sortKey="season" align="left" sticky />
          <SortableHeader label="Team" sortKey="team" align="left" defaultDirection="asc" />
          {columns.map(column => <SortableHeader key={column.key} label={column.label} sortKey={column.key} nowrap description={column.description} />)}
        </tr></thead>
        <tbody>{filtered.map(row => <tr key={`${row.kind}-${row.seasonId}`}>
          <td className="workspace-sticky-entity whitespace-nowrap" data-sort-value={row.seasonId}>{Math.floor(row.seasonId / 10000)}–{String(row.seasonId % 10000).slice(-2)}</td>
          <td className="text-left whitespace-nowrap">{row.teams?.replaceAll(",", " / ") || "—"}</td>
          {columns.map(column => { const value = valueFor(row, column); return <td key={column.key} className={`text-center tabular-nums ${column.advanced ? "reference-career-advanced" : ""}`} data-sort-value={value ?? ""}>{format(value, column)}</td>; })}
        </tr>)}</tbody>
        <tfoot><tr>
          <th scope="row" className="text-left reference-career-total-label" title="Totals for the selected phase. A dash means complete career data is unavailable.">Career Total</th>
          <td aria-label="All teams" />
          {columns.map(column => <td key={column.key} className={`text-center tabular-nums ${column.advanced ? "reference-career-advanced" : ""}`}>{format(careerTotal(filtered, column.key), column)}</td>)}
        </tr></tfoot>
      </table></TableScroll>
    </SortableTable></div>
  </section>;
}
