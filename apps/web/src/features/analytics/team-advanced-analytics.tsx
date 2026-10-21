"use client";
import { perSixty } from "@/lib/per-sixty";
import { TableScroll } from "@/components/ui/table-scroll";

import type { MoneyPuckTeamSeason, MoneyPuckTeamSituation } from "@/contracts/advanced";
import { SortableHeader } from "@/components/ui/sortable-header";
import { SortableTable } from "@/components/ui/sortable-table";

export function TeamAdvancedAnalytics({
  data,
  seasonId,
}: {
  data: MoneyPuckTeamSeason | null;
  seasonId: number;
}) {
  if (!data) {
    return <AdvancedUnavailable seasonId={seasonId} entity="team" />;
  }

  return (
    <section className="workspace-width-compact mt-8" aria-label="Team advanced stats">
      <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--table-background)]">
        <SortableTable>
        <TableScroll className="overflow-x-auto">
          <table className="modern-table-readable workspace-table workspace-table-dense workspace-table-semantic min-w-[760px]">
            <colgroup>
              <col className="workspace-col-entity" />
              <col className="workspace-col-percentage" span={3} />
              <col className="workspace-col-percentage" span={5} />
            </colgroup>
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                <MetricHeader label="Situation" align="left" />
                <MetricHeader label="CF%" />
                <MetricHeader label="FF%" />
                <MetricHeader label="xGF/60" />
                <MetricHeader label="xGA/60" />
                <MetricHeader label="xG%" />
                <MetricHeader label="HD xGF/60" />
                <MetricHeader label="HD xGA/60" />
                <MetricHeader label="HD xG%" />
              </tr>
            </thead>
            <tbody>
              {data.situations.filter((row) => ["5on5", "5on4", "4on5"].includes(row.situation)).map((row) => (
                <TeamAdvancedRow key={row.situation} row={row} />
              ))}
            </tbody>
          </table>
        </TableScroll>
        </SortableTable>
      </div>
    </section>
  );
}

function TeamAdvancedRow({ row }: { row: MoneyPuckTeamSituation }) {
  return (
    <tr className="border-b border-[var(--border)] text-[var(--foreground-soft)] last:border-0">
      <TextCell value={situationLabel(row.situation)} />
      <ValueCell value={formatPercentage(row.corsiPercentage)} />
      <ValueCell value={formatPercentage(row.fenwickPercentage)} />
      <ValueCell value={formatDecimal(perSixty(row.expectedGoalsFor, row.iceTimeSeconds))} />
      <ValueCell value={formatDecimal(perSixty(row.expectedGoalsAgainst, row.iceTimeSeconds))} />
      <ValueCell value={formatPercentage(row.expectedGoalsPercentage)} highlight />
      <ValueCell value={formatDecimal(perSixty(row.highDangerExpectedGoalsFor, row.iceTimeSeconds))} />
      <ValueCell value={formatDecimal(perSixty(row.highDangerExpectedGoalsAgainst, row.iceTimeSeconds))} />
      <ValueCell value={formatPercentage(row.highDangerExpectedGoalsPercentage ?? null)} />
    </tr>
  );
}

function AdvancedUnavailable({
  seasonId,
  entity,
}: {
  seasonId: number;
  entity: "team" | "player";
}) {
  return (
    <section className="mt-12 rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-6">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent-secondary)]">
        Advanced analytics
      </p>
      <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
        MoneyPuck data unavailable
      </h3>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        {seasonId < 20082009
          ? "MoneyPuck season summaries begin with the 2008–09 season."
          : `No MoneyPuck ${entity} season summary is stored for this selection.`}
      </p>
    </section>
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

function TextCell({ value }: { value: string }) {
  return <td className="px-4 py-3 text-left font-medium text-[var(--foreground)]">{value}</td>;
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

function situationLabel(situation: string): string {
  const labels: Record<string, string> = {
    all: "All situations",
    "5on5": "5-on-5",
    "5on4": "5-on-4",
    "4on5": "4-on-5",
    other: "Other",
  };
  return labels[situation] ?? situation;
}

function formatPercentage(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatDecimal(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}
