"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  type TooltipContentProps,
} from "recharts";

import {
  ChartFilterButton,
  ChartFilterGroup,
} from "@/app/_components/chart-controls";
import { TeamLogo } from "@/app/_components/team-logo";
import {
  buildTeamPlotPoints,
  comparisonDomain,
  filterTeamComparisonPoints,
  type TeamComparisonGroup,
  type TeamComparisonPoint,
  type TeamPlotPoint,
  type TeamProcessMetric,
} from "@/lib/team-comparison";

const PROCESS_METRICS = [
  {
    value: "expectedGoalSharePercentage",
    label: "Five-on-Five Expected-Goal Share",
    shortLabel: "5-on-5 xG Share",
  },
  {
    value: "corsiSharePercentage",
    label: "Five-on-Five Corsi Share",
    shortLabel: "5-on-5 Corsi Share",
  },
  {
    value: "fenwickSharePercentage",
    label: "Five-on-Five Fenwick Share",
    shortLabel: "5-on-5 Fenwick Share",
  },
] as const;

const GROUPS = [
  {
    value: "strong",
    label: "Strong",
    description: "Results and process are both above 50%.",
    color: "var(--positive)",
  },
  {
    value: "outperforming",
    label: "Outperforming",
    description: "Results are above 50%, but process is below it.",
    color: "var(--chart-secondary)",
  },
  {
    value: "underperforming",
    label: "Underperforming",
    description: "Process is above 50%, but results are below it.",
    color: "var(--chart-primary)",
  },
  {
    value: "struggling",
    label: "Struggling",
    description: "Results and process are both below 50%.",
    color: "var(--negative)",
  },
] as const;

export function TeamComparisonScatterplot({
  points,
  phase,
}: {
  points: TeamComparisonPoint[];
  phase: "regular" | "playoffs";
}) {
  const [group, setGroup] = useState<TeamComparisonGroup>("all");
  const [processMetric, setProcessMetric] = useState<TeamProcessMetric>(
    "expectedGoalSharePercentage",
  );
  const processDefinition =
    PROCESS_METRICS.find((metric) => metric.value === processMetric) ??
    PROCESS_METRICS[0];
  const plotPoints = useMemo(
    () => buildTeamPlotPoints(points, processMetric),
    [points, processMetric],
  );
  const visiblePoints = useMemo(
    () => filterTeamComparisonPoints(plotPoints, group),
    [group, plotPoints],
  );
  const xDomain = useMemo(
    () =>
      comparisonDomain(
        plotPoints.map((point) => point.processPercentage),
      ),
    [plotPoints],
  );
  const yDomain = useMemo(
    () =>
      comparisonDomain(
        points.map((point) => point.resultPercentage),
      ),
    [points],
  );
  const resultLabel =
    phase === "regular" ? "Points Percentage" : "Win Percentage";

  if (points.length === 0) {
    return null;
  }

  return (
    <>
      <section className="workspace-chart-panel workspace-comparison-panel">
      <header className="workspace-player-chart-header">
        <div>
          <p>League comparison</p>
          <h4>Results vs. Five-on-Five Process</h4>
        </div>
        <p>
          Compare each team&apos;s selected five-on-five process metric with
          its {resultLabel.toLowerCase()}. The 50% reference lines separate
          sustainable strength from over- and underperformance.
        </p>
      </header>

      <div className="workspace-team-process-control">
        <label>
          Process metric
          <select
            value={processMetric}
            onChange={(event) =>
              setProcessMetric(event.target.value as TeamProcessMetric)
            }
          >
            {PROCESS_METRICS.map((metric) => (
              <option key={metric.value} value={metric.value}>
                {metric.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="workspace-chart-toolbar">
        <p>
          Hover or tap a team for exact values. The axes stay fixed while
          filtering so each team remains in the same league context.
        </p>
        <div className="workspace-chart-filters">
          <ChartFilterGroup label="Quadrant">
            <ChartFilterButton
              active={group === "all"}
              label="All Teams"
              onClick={() => setGroup("all")}
            />
            {GROUPS.map((option) => (
              <ChartFilterButton
                key={option.value}
                active={group === option.value}
                label={option.label}
                onClick={() => setGroup(option.value)}
              />
            ))}
          </ChartFilterGroup>
        </div>
      </div>

      {visiblePoints.length > 0 ? (
        <div
          className="workspace-chart workspace-comparison-chart"
          role="img"
          aria-label={`Scatterplot comparing ${plotPoints.length} teams by ${processDefinition.label.toLowerCase()} and ${resultLabel.toLowerCase()}.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 18, right: 20, bottom: 34, left: 18 }}
              accessibilityLayer
            >
              <CartesianGrid
                stroke="var(--chart-grid)"
                strokeDasharray="3 5"
              />
              <XAxis
                type="number"
                dataKey="processPercentage"
                name={processDefinition.label}
                unit="%"
                domain={xDomain}
                tickFormatter={formatPercentage}
                tick={{
                  fill: "var(--chart-label)",
                  fontSize: 13,
                }}
                tickLine={false}
                axisLine={{ stroke: "var(--chart-axis)" }}
                label={{
                  value: processDefinition.shortLabel,
                  position: "insideBottom",
                  offset: -20,
                  fill: "var(--chart-label)",
                  fontSize: 12,
                }}
              />
              <YAxis
                type="number"
                dataKey="resultPercentage"
                name={resultLabel}
                unit="%"
                domain={yDomain}
                tickFormatter={formatPercentage}
                tick={{
                  fill: "var(--chart-label)",
                  fontSize: 13,
                }}
                tickLine={false}
                axisLine={{ stroke: "var(--chart-axis)" }}
                width={52}
                label={{
                  value: resultLabel,
                  angle: -90,
                  position: "insideLeft",
                  offset: -8,
                  fill: "var(--chart-label)",
                  fontSize: 12,
                }}
              />
              <ZAxis range={[95, 95]} />
              <ReferenceLine
                x={50}
                stroke="var(--chart-reference)"
                strokeDasharray="5 5"
              />
              <ReferenceLine
                y={50}
                stroke="var(--chart-reference)"
                strokeDasharray="5 5"
              />
              <Tooltip
                content={
                  <TeamComparisonTooltip
                    processLabel={processDefinition.shortLabel}
                  />
                }
                cursor={{ stroke: "var(--chart-reference)" }}
              />
              {GROUPS.map((series) => (
                <Scatter
                  key={series.value}
                  name={series.label}
                  data={visiblePoints.filter(
                    (point) => point.group === series.value,
                  )}
                  fill={series.color}
                  isAnimationActive={false}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="workspace-chart-empty">
          No teams fall in this quadrant for the selected season phase.
        </p>
      )}

      <div className="workspace-comparison-key" aria-label="Quadrant key">
        {GROUPS.map((item) => (
          <div key={item.value}>
            <span style={{ background: item.color }} aria-hidden="true" />
            <p>
              <b>{item.label}</b>
              {item.description}
            </p>
          </div>
        ))}
      </div>

      <table className="sr-only">
        <caption>Team comparison plot values</caption>
        <thead>
          <tr>
            <th>Team</th>
            <th>{processDefinition.label}</th>
            <th>{resultLabel}</th>
            <th>Group</th>
          </tr>
        </thead>
        <tbody>
          {visiblePoints.map((point) => (
            <tr key={point.nhlTeamId}>
              <td>{point.name}</td>
              <td>
                {formatDetailedPercentage(
                  point.processPercentage,
                )}
              </td>
              <td>{formatDetailedPercentage(point.resultPercentage)}</td>
              <td>{groupLabel(point.group)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </section>

      <DirectTeamComparison points={points} />
    </>
  );
}

function TeamComparisonTooltip({
  active,
  payload = [],
  processLabel,
}: Partial<TooltipContentProps<number, string>> & {
  processLabel: string;
}) {
  const point = payload[0]?.payload as TeamPlotPoint | undefined;
  if (!active || !point) {
    return null;
  }

  return (
    <div className="workspace-chart-tooltip">
      <p className="workspace-chart-tooltip-date">
        {groupLabel(point.group)}
      </p>
      <p className="workspace-chart-tooltip-game">
        <span className="inline-flex items-center gap-1.5">
          <TeamLogo
            nhlTeamId={point.nhlTeamId}
            abbreviation={point.abbreviation}
            name={point.name}
            size="tiny"
            decorative
          />
          {point.name} · {point.abbreviation}
        </span>
      </p>
      <dl>
        <div>
          <dt>{processLabel}</dt>
          <dd>{formatDetailedPercentage(point.processPercentage)}</dd>
        </div>
        <div>
          <dt>{point.resultLabel}</dt>
          <dd>{formatDetailedPercentage(point.resultPercentage)}</dd>
        </div>
        <div>
          <dt>Results minus process</dt>
          <dd>{formatSignedPercentagePoints(point.gapPercentagePoints)}</dd>
        </div>
        <div>
          <dt>Games</dt>
          <dd>{point.gamesPlayed}</dd>
        </div>
      </dl>
    </div>
  );
}

function DirectTeamComparison({
  points,
}: {
  points: TeamComparisonPoint[];
}) {
  const [firstId, setFirstId] = useState("");
  const [secondId, setSecondId] = useState("");
  const first = points.find((point) => String(point.nhlTeamId) === firstId);
  const second = points.find((point) => String(point.nhlTeamId) === secondId);

  return (
    <section className="workspace-direct-comparison">
      <header>
        <div>
          <p>Direct comparison</p>
          <h4>Compare Two Teams</h4>
        </div>
        <p>
          Select two teams to compare results with every available
          five-on-five process measure.
        </p>
      </header>

      <div className="workspace-direct-comparison-selectors">
        <TeamSelector
          label="Team A"
          value={firstId}
          points={points}
          disabledId={secondId}
          onChange={setFirstId}
        />
        <button
          type="button"
          disabled={!firstId && !secondId}
          onClick={() => {
            setFirstId(secondId);
            setSecondId(firstId);
          }}
        >
          Swap Teams
        </button>
        <TeamSelector
          label="Team B"
          value={secondId}
          points={points}
          disabledId={firstId}
          onChange={setSecondId}
        />
      </div>

      {first && second ? (
        <div className="workspace-direct-comparison-table">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>
                  {first.name}
                  <span className="flex items-center justify-center gap-1.5">
                    <TeamLogo {...first} size="tiny" decorative />
                    {first.abbreviation}
                  </span>
                </th>
                <th>
                  {second.name}
                  <span className="flex items-center justify-center gap-1.5">
                    <TeamLogo {...second} size="tiny" decorative />
                    {second.abbreviation}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Games</th>
                <td>{first.gamesPlayed}</td>
                <td>{second.gamesPlayed}</td>
              </tr>
              <tr>
                <th>{first.resultLabel}</th>
                <td>{formatDetailedPercentage(first.resultPercentage)}</td>
                <td>{formatDetailedPercentage(second.resultPercentage)}</td>
              </tr>
              {PROCESS_METRICS.map((metric) => (
                <tr key={metric.value}>
                  <th>{metric.label}</th>
                  <td>
                    {formatOptionalPercentage(
                      first.processMetrics[metric.value],
                    )}
                  </td>
                  <td>
                    {formatOptionalPercentage(
                      second.processMetrics[metric.value],
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="workspace-direct-comparison-empty">
          Choose two teams to reveal their side-by-side comparison.
        </p>
      )}
    </section>
  );
}

function TeamSelector({
  label,
  value,
  points,
  disabledId,
  onChange,
}: {
  label: string;
  value: string;
  points: TeamComparisonPoint[];
  disabledId: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select a team</option>
        {points.map((point) => {
          const id = String(point.nhlTeamId);
          return (
            <option key={id} value={id} disabled={id === disabledId}>
              {point.name} — {point.abbreviation}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function groupLabel(group: Exclude<TeamComparisonGroup, "all">) {
  return GROUPS.find((item) => item.value === group)?.label ?? group;
}

function formatPercentage(value: number) {
  return `${Math.round(value)}%`;
}

function formatDetailedPercentage(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatSignedPercentagePoints(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} pp`;
}

function formatOptionalPercentage(value: number | undefined) {
  return value === undefined ? "—" : formatDetailedPercentage(value);
}
