import { TableScroll } from "@/components/ui/table-scroll";
import Link from "@/components/ui/exploration-link";

import { SortableHeader } from "@/components/ui/sortable-header";
import { SortableTable } from "@/components/ui/sortable-table";

import type { MoneyPuckGameUnit } from "@/contracts/advanced-game";

export function UnitTable({
  title,
  rows,
  seasonId,
}: {
  title: string;
  rows: MoneyPuckGameUnit[];
  seasonId: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--table-background)]">
      <SortableTable defaultSortKey="TOI">
        <TableScroll className="overflow-x-auto">
          <table className="workspace-table workspace-table-dense workspace-table-semantic reference-game-lines">
            <colgroup>
              <col style={{ width: "40%" }} />
              <col span={7} style={{ width: "8.57%" }} />
            </colgroup>
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                <MetricHeader label={title} align="left" />
                <MetricHeader label="TOI" />
                <MetricHeader label="GF" />
                <MetricHeader label="GA" />
                <MetricHeader label="xGF" />
                <MetricHeader label="xGA" />
                <MetricHeader label="xG%" />
                <MetricHeader label="FF%" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.team.nhlTeamId}-${row.unitType}-${row.sourceLineId}`}
                  className="border-b border-[var(--border)] text-[var(--foreground-soft)] last:border-0 hover:bg-[var(--surface-subtle)]"
                >
                  <td className="px-4 py-3 text-left">
                    <div className="truncate" title={row.players.map(player => player.name).join(" / ")}>
                      {row.players.map((player, index) => (
                        <span key={player.nhlPlayerId}>
                          {index > 0 ? <span className="text-[var(--muted)]"> / </span> : null}
                          <Link
                            href={`/players/${player.nhlPlayerId}?season=${seasonId}`}
                            className="font-medium text-[var(--foreground)] transition hover:text-[var(--accent)]"
                          >
                            {player.name.replace(/^(\S+)\s+/, (_, first: string) => first[0] + ". ")}
                          </Link>
                        </span>
                      ))}
                    </div>
                  </td>
                  <ValueCell value={formatTimeOnIce(row.iceTimeSeconds)} />
                  <ValueCell value={formatDecimal(row.goalsFor, 0)} />
                  <ValueCell value={formatDecimal(row.goalsAgainst, 0)} />
                  <ValueCell value={formatDecimal(row.expectedGoalsFor)} />
                  <ValueCell value={formatDecimal(row.expectedGoalsAgainst)} />
                  <ValueCell value={formatPercentage(row.expectedGoalsPercentage)} />
                  <ValueCell value={formatPercentage(row.fenwickPercentage)} />
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </SortableTable>
    </div>
  );
}

function MetricHeader({
  label,
  align = "right",
}: {
  label: string;
  align?: "left" | "center" | "right";
}) {
  return (
    <SortableHeader
      label={label}
      sortKey={label}
      align={align}
      defaultDirection={align === "left" ? "asc" : "desc"}
    />
  );
}

function ValueCell({
  value,
  highlight = false,
}: {
  value: string;
  highlight?: boolean;
}) {
  return (
    <td
      className={`workspace-semantic-number px-4 py-3 text-center tabular-nums ${
        highlight ? "font-semibold text-[var(--accent)]" : "text-[var(--foreground-soft)]"
      }`}
    >
      {value}
    </td>
  );
}

function formatPercentage(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatDecimal(value: number | null, digits = 2): string {
  return value === null ? "—" : value.toFixed(digits);
}

function formatTimeOnIce(seconds: number): string {
  const roundedSeconds = Math.round(seconds);
  return `${Math.floor(roundedSeconds / 60)}:${String(roundedSeconds % 60).padStart(2, "0")}`;
}
