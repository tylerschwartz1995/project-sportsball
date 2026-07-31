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
import {
  comparisonDomain,
  filterTeamComparisonPoints,
  type TeamComparisonGroup,
  type TeamComparisonPoint,
} from "@/lib/team-comparison";

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
  const visiblePoints = useMemo(
    () => filterTeamComparisonPoints(points, group),
    [group, points],
  );
  const xDomain = useMemo(
    () =>
      comparisonDomain(
        points.map((point) => point.expectedGoalSharePercentage),
      ),
    [points],
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
    <section className="workspace-chart-panel workspace-comparison-panel">
      <header className="workspace-player-chart-header">
        <div>
          <p>League comparison</p>
          <h4>Results vs. Five-on-Five Process</h4>
        </div>
        <p>
          Compare each team&apos;s five-on-five expected-goal share with its{" "}
          {resultLabel.toLowerCase()}. The 50% reference lines separate
          sustainable strength from over- and underperformance.
        </p>
      </header>

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
          aria-label={`Scatterplot comparing ${points.length} teams by five-on-five expected-goal share and ${resultLabel.toLowerCase()}.`}
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
                dataKey="expectedGoalSharePercentage"
                name="Five-on-Five Expected-Goal Share"
                unit="%"
                domain={xDomain}
                tickFormatter={formatPercentage}
                tick={{
                  fill: "var(--chart-label)",
                  fontSize: 11,
                }}
                tickLine={false}
                axisLine={{ stroke: "var(--chart-axis)" }}
                label={{
                  value: "Five-on-Five Expected-Goal Share",
                  position: "insideBottom",
                  offset: -20,
                  fill: "var(--chart-label)",
                  fontSize: 11,
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
                  fontSize: 11,
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
                  fontSize: 11,
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
                content={<TeamComparisonTooltip />}
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
            <th>Five-on-Five Expected-Goal Share</th>
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
                  point.expectedGoalSharePercentage,
                )}
              </td>
              <td>{formatDetailedPercentage(point.resultPercentage)}</td>
              <td>{groupLabel(point.group)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function TeamComparisonTooltip({
  active,
  payload = [],
}: Partial<TooltipContentProps<number, string>>) {
  const point = payload[0]?.payload as TeamComparisonPoint | undefined;
  if (!active || !point) {
    return null;
  }

  return (
    <div className="workspace-chart-tooltip">
      <p className="workspace-chart-tooltip-date">
        {groupLabel(point.group)}
      </p>
      <p className="workspace-chart-tooltip-game">
        {point.name} · {point.abbreviation}
      </p>
      <dl>
        <div>
          <dt>5-on-5 xG share</dt>
          <dd>{formatDetailedPercentage(point.expectedGoalSharePercentage)}</dd>
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
