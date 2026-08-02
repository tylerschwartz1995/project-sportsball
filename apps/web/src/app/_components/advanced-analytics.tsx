"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  MoneyPuckGoalieSituation,
  MoneyPuckPlayerSeason,
  MoneyPuckSkaterSituation,
  MoneyPuckTeamSeason,
  MoneyPuckTeamSituation,
} from "@/contracts/advanced";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { TeamLogo } from "@/app/_components/team-logo";

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

  const fiveOnFive = data.situations.find(
    (row) => row.situation === "5on5",
  );

  return (
    <AdvancedSection
      title="Team Advanced Analytics"
      description="Possession and expected-goal results by game situation."
      width="compact"
    >
      {fiveOnFive ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <AdvancedCard
            label="5-on-5 xG share"
            value={formatPercentage(fiveOnFive.expectedGoalsPercentage)}
          />
          <AdvancedCard
            label="5-on-5 Corsi share"
            value={formatPercentage(fiveOnFive.corsiPercentage)}
          />
          <AdvancedCard
            label="5-on-5 Fenwick share"
            value={formatPercentage(fiveOnFive.fenwickPercentage)}
          />
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
        <SortableTable>
        <div className="overflow-x-auto">
          <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[760px]">
            <colgroup>
              <col className="workspace-col-entity" />
              <col className="workspace-col-percentage" span={3} />
              <col className="workspace-col-number" span={4} />
            </colgroup>
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.12em] text-slate-400">
                <MetricHeader label="Situation" align="left" />
                <MetricHeader label="xG%" />
                <MetricHeader label="CF%" />
                <MetricHeader label="FF%" />
                <MetricHeader label="xGF" />
                <MetricHeader label="xGA" />
                <MetricHeader label="GF" />
                <MetricHeader label="GA" />
              </tr>
            </thead>
            <tbody>
              {data.situations.map((row) => (
                <TeamAdvancedRow key={row.situation} row={row} />
              ))}
            </tbody>
          </table>
        </div>
        </SortableTable>
      </div>
      <MetricDefinitions seasonId={data.seasonId} />
    </AdvancedSection>
  );
}

export function PlayerAdvancedAnalytics({
  data,
}: {
  data: MoneyPuckPlayerSeason;
}) {
  const hasSkaterRows = data.skaterSituations.length > 0;
  const hasGoalieRows = data.goalieSituations.length > 0;
  const situations = useMemo(
    () =>
      Array.from(
        new Set([
          ...data.skaterSituations.map((row) => row.situation),
          ...data.goalieSituations.map((row) => row.situation),
        ]),
      ).sort(situationOrder),
    [data.goalieSituations, data.skaterSituations],
  );
  const [situation, setSituation] = useState(
    hasSkaterRows && situations.includes("5on5")
      ? "5on5"
      : situations.includes("all")
        ? "all"
        : situations[0] ?? "",
  );
  const skaterRows = data.skaterSituations.filter(
    (row) => row.situation === situation,
  );
  const goalieRows = data.goalieSituations.filter(
    (row) => row.situation === situation,
  );

  if (!hasSkaterRows && !hasGoalieRows) {
    return <AdvancedUnavailable seasonId={data.seasonId} entity="player" />;
  }

  return (
    <AdvancedSection
      title="Player Advanced Analytics"
      description="MoneyPuck season metrics remain split by team. Select one game situation at a time."
      width="standard"
    >
      <label className="workspace-advanced-situation-filter">
        Game situation
        <select
          value={situation}
          onChange={(event) => setSituation(event.target.value)}
        >
          {situations.map((option) => (
            <option key={option} value={option}>
              {situationLabel(option)}
            </option>
          ))}
        </select>
      </label>
      {hasSkaterRows && skaterRows.length > 0 ? (
        <SkaterAdvancedTable rows={skaterRows} />
      ) : null}
      {hasGoalieRows && goalieRows.length > 0 ? (
        <GoalieAdvancedTable rows={goalieRows} />
      ) : null}
      <MetricDefinitions seasonId={data.seasonId} />
    </AdvancedSection>
  );
}

function situationOrder(left: string, right: string) {
  const order = ["all", "5on5", "5on4", "4on5", "other"];
  const leftIndex = order.indexOf(left);
  const rightIndex = order.indexOf(right);
  return (leftIndex === -1 ? order.length : leftIndex) -
    (rightIndex === -1 ? order.length : rightIndex);
}

function AdvancedSection({
  title,
  description,
  children,
  width,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  width: "compact" | "standard";
}) {
  return (
    <section className={`workspace-width-${width} mt-12`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-300">
            Advanced analytics
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>
        <MoneyPuckAttribution />
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SkaterAdvancedTable({
  rows,
}: {
  rows: MoneyPuckSkaterSituation[];
}) {
  const fiveOnFive = rows.find((row) => row.situation === "5on5");

  return (
    <>
      {fiveOnFive ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <AdvancedCard
            label="5-on-5 xG share"
            value={formatPercentage(fiveOnFive.onIceExpectedGoalsPercentage)}
          />
          <AdvancedCard
            label="5-on-5 individual xG"
            value={formatDecimal(fiveOnFive.individualExpectedGoals)}
          />
          <AdvancedCard
            label="Season game score"
            value={formatDecimal(fiveOnFive.gameScore)}
          />
        </div>
      ) : null}
      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
        <SortableTable>
        <div className="overflow-x-auto">
          <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[840px]">
            <colgroup>
              <col className="workspace-col-team" />
              <col className="workspace-col-label" />
              <col className="workspace-col-percentage" span={3} />
              <col className="workspace-col-number" span={4} />
            </colgroup>
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.12em] text-slate-400">
                <MetricHeader label="Team" align="left" />
                <MetricHeader label="Situation" align="left" />
                <MetricHeader label="xG%" />
                <MetricHeader label="CF%" />
                <MetricHeader label="FF%" />
                <MetricHeader label="ixG" />
                <MetricHeader label="Goals" />
                <MetricHeader label="Points" />
                <MetricHeader label="Game score" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.team.nhlTeamId}-${row.situation}`}
                  className="border-b border-white/[0.06] text-slate-300 last:border-0"
                >
                  <TeamCell team={row.team} />
                  <TextCell value={situationLabel(row.situation)} />
                  <ValueCell
                    value={formatPercentage(
                      row.onIceExpectedGoalsPercentage,
                    )}
                    highlight
                  />
                  <ValueCell
                    value={formatPercentage(row.onIceCorsiPercentage)}
                  />
                  <ValueCell
                    value={formatPercentage(row.onIceFenwickPercentage)}
                  />
                  <ValueCell value={formatDecimal(row.individualExpectedGoals)} />
                  <ValueCell value={formatDecimal(row.individualGoals)} />
                  <ValueCell value={formatDecimal(row.individualPoints)} />
                  <ValueCell value={formatDecimal(row.gameScore)} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </SortableTable>
      </div>
    </>
  );
}

function GoalieAdvancedTable({
  rows,
}: {
  rows: MoneyPuckGoalieSituation[];
}) {
  const allSituations = rows.find((row) => row.situation === "all");
  const goalsSavedAboveExpected = allSituations
    ? difference(
        allSituations.expectedGoalsAgainst,
        allSituations.goalsAgainst,
      )
    : null;

  return (
    <>
      {allSituations ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <AdvancedCard
            label="Goals saved above expected"
            value={formatSignedDecimal(goalsSavedAboveExpected)}
          />
          <AdvancedCard
            label="Expected goals against"
            value={formatDecimal(allSituations.expectedGoalsAgainst)}
          />
          <AdvancedCard
            label="Actual goals against"
            value={formatDecimal(allSituations.goalsAgainst)}
          />
        </div>
      ) : null}
      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
        <SortableTable>
        <div className="overflow-x-auto">
          <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[760px]">
            <colgroup>
              <col className="workspace-col-team" />
              <col className="workspace-col-label" />
              <col className="workspace-col-number" span={5} />
            </colgroup>
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.12em] text-slate-400">
                <MetricHeader label="Team" align="left" />
                <MetricHeader label="Situation" align="left" />
                <MetricHeader label="xGA" />
                <MetricHeader label="GA" />
                <MetricHeader label="GSAx" />
                <MetricHeader label="Expected SOG" />
                <MetricHeader label="SOG" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.team.nhlTeamId}-${row.situation}`}
                  className="border-b border-white/[0.06] text-slate-300 last:border-0"
                >
                  <TeamCell team={row.team} />
                  <TextCell value={situationLabel(row.situation)} />
                  <ValueCell value={formatDecimal(row.expectedGoalsAgainst)} />
                  <ValueCell value={formatDecimal(row.goalsAgainst)} />
                  <ValueCell
                    value={formatSignedDecimal(
                      difference(
                        row.expectedGoalsAgainst,
                        row.goalsAgainst,
                      ),
                    )}
                    highlight
                  />
                  <ValueCell
                    value={formatDecimal(row.expectedShotsOnGoalAgainst)}
                  />
                  <ValueCell value={formatDecimal(row.shotsOnGoalAgainst)} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </SortableTable>
      </div>
    </>
  );
}

function TeamAdvancedRow({ row }: { row: MoneyPuckTeamSituation }) {
  return (
    <tr className="border-b border-white/[0.06] text-slate-300 last:border-0">
      <TextCell value={situationLabel(row.situation)} />
      <ValueCell
        value={formatPercentage(row.expectedGoalsPercentage)}
        highlight
      />
      <ValueCell value={formatPercentage(row.corsiPercentage)} />
      <ValueCell value={formatPercentage(row.fenwickPercentage)} />
      <ValueCell value={formatDecimal(row.expectedGoalsFor)} />
      <ValueCell value={formatDecimal(row.expectedGoalsAgainst)} />
      <ValueCell value={formatDecimal(row.goalsFor)} />
      <ValueCell value={formatDecimal(row.goalsAgainst)} />
    </tr>
  );
}

function AdvancedCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-violet-300/15 bg-violet-300/[0.06] p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-violet-200/70">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-white">
        {value}
      </p>
    </article>
  );
}

function MetricDefinitions({ seasonId }: { seasonId: number }) {
  return (
    <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.025] p-4 text-sm leading-6 text-slate-400">
      <p>
        <strong className="text-slate-200">xG%</strong> is the share of expected
        goals while the team or player was on the ice.{" "}
        <strong className="text-slate-200">CF%</strong> is the share of all shot
        attempts. <strong className="text-slate-200">FF%</strong> excludes
        blocked attempts. <strong className="text-slate-200">GSAx</strong> is
        expected goals against minus actual goals against; positive is better.
      </p>
      <Link
        href={`/analytics/guide?season=${seasonId}`}
        className="mt-3 inline-block font-medium text-violet-300 transition hover:text-violet-200"
      >
        Open the full metric guide →
      </Link>
    </div>
  );
}

function MoneyPuckAttribution() {
  return (
    <a
      href="https://moneypuck.com/"
      target="_blank"
      rel="noreferrer"
      className="text-sm font-medium text-violet-300 transition hover:text-violet-200"
    >
      Data: MoneyPuck.com ↗
    </a>
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
    <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-300">
        Advanced analytics
      </p>
      <h3 className="mt-2 text-xl font-semibold text-white">
        MoneyPuck data unavailable
      </h3>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        {seasonId < 20082009
          ? "MoneyPuck season summaries begin with the 2008–09 season."
          : `No MoneyPuck ${entity} season summary is stored for this selection.`}
      </p>
    </section>
  );
}

function MetricHeader({
  label,
  align = "center",
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
  return <td className="px-4 py-3 text-left font-medium text-white">{value}</td>;
}

function TeamCell({ team }: { team: MoneyPuckSkaterSituation["team"] }) {
  return (
    <td className="px-4 py-3 text-left font-medium text-white">
      <span className="inline-flex items-center gap-2">
        <TeamLogo {...team} size="tiny" decorative />
        {team.abbreviation}
      </span>
    </td>
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
        highlight ? "font-semibold text-violet-200" : "text-slate-300"
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

function formatSignedDecimal(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

function difference(
  left: number | null,
  right: number | null,
): number | null {
  return left === null || right === null ? null : left - right;
}
