"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
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
  buildCenteredDistribution,
  filterPlayerComparisonPoints,
  numericDomain,
  signedDomain,
  type DistributionBin,
  type GoalieComparisonPoint,
  type PlayerComparisonGroup,
  type PlayerComparisonPoint,
  type SkaterComparisonPoint,
} from "@/lib/player-comparison";

type PlayerComparisonPlotsProps =
  | {
      kind: "skater";
      points: SkaterComparisonPoint[];
    }
  | {
      kind: "goalie";
      points: GoalieComparisonPoint[];
    };

const SKATER_GROUPS = [
  {
    value: "forwards",
    label: "Forwards",
    color: "var(--chart-primary)",
  },
  {
    value: "defense",
    label: "Defense",
    color: "var(--chart-secondary)",
  },
] as const;

const GOALIE_GROUPS = [
  {
    value: "aboveExpected",
    label: "Above Expected",
    color: "var(--positive)",
  },
  {
    value: "belowExpected",
    label: "Below Expected",
    color: "var(--negative)",
  },
] as const;

export function PlayerComparisonPlots(props: PlayerComparisonPlotsProps) {
  const { kind, points } = props;
  const allPoints: PlayerComparisonPoint[] = points;
  const [group, setGroup] = useState<PlayerComparisonGroup>("all");
  const options = kind === "skater" ? SKATER_GROUPS : GOALIE_GROUPS;
  const visiblePoints = useMemo(
    () => filterPlayerComparisonPoints(allPoints, group),
    [allPoints, group],
  );
  const differenceDomain = useMemo(
    () => signedDomain(allPoints.map((point) => point.differenceValue)),
    [allPoints],
  );
  const distribution = useMemo(
    () =>
      buildCenteredDistribution(
        visiblePoints.map((point) => point.differenceValue),
        9,
        differenceDomain[1],
      ),
    [differenceDomain, visiblePoints],
  );
  const axis = useMemo(
    () => chartAxes(kind, allPoints),
    [allPoints, kind],
  );
  const config = chartConfig(kind);

  if (points.length === 0) {
    return null;
  }

  return (
    <section className="workspace-chart-panel workspace-comparison-panel">
      <header className="workspace-player-chart-header">
        <div>
          <p>{kind === "skater" ? "Skater comparison" : "Goalie comparison"}</p>
          <h4>{config.title}</h4>
        </div>
        <p>{config.description}</p>
      </header>

      <div className="workspace-chart-toolbar">
        <p>
          Rates are normalized per 60 minutes. The page&apos;s situation and
          minimum-ice-time filters determine which player-team rows qualify.
        </p>
        <div className="workspace-chart-filters">
          <ChartFilterGroup label={config.filterLabel}>
            <ChartFilterButton
              active={group === "all"}
              label="All"
              onClick={() => setGroup("all")}
            />
            {options.map((option) => (
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
        <div className="workspace-player-comparison-grid">
          <div>
            <div className="workspace-comparison-plot-heading">
              <h5>{config.scatterTitle}</h5>
              <p>Hover or tap a point for the player&apos;s exact values.</p>
            </div>
            <div
              className="workspace-chart workspace-player-comparison-chart"
              role="img"
              aria-label={config.scatterAriaLabel(points.length)}
            >
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 14, right: 18, bottom: 34, left: 12 }}
                  accessibilityLayer
                >
                  <CartesianGrid
                    stroke="var(--chart-grid)"
                    strokeDasharray="3 5"
                  />
                  <XAxis
                    type="number"
                    dataKey="xValue"
                    domain={axis.xDomain}
                    tickFormatter={formatRate}
                    tick={axisTick}
                    tickLine={false}
                    axisLine={{ stroke: "var(--chart-axis)" }}
                    label={axisLabel(config.xLabel, "insideBottom", -20)}
                  />
                  <YAxis
                    type="number"
                    dataKey="yValue"
                    domain={axis.yDomain}
                    tickFormatter={formatSignedRate}
                    tick={axisTick}
                    tickLine={false}
                    axisLine={{ stroke: "var(--chart-axis)" }}
                    width={52}
                    label={{
                      ...axisLabel(config.yLabel, "insideLeft", -8),
                      angle: -90,
                    }}
                  />
                  <ZAxis range={[78, 78]} />
                  {kind === "skater" ? (
                    <ReferenceLine
                      segment={[
                        {
                          x: axis.xDomain[0],
                          y: axis.yDomain[0],
                        },
                        {
                          x: axis.xDomain[1],
                          y: axis.yDomain[1],
                        },
                      ]}
                      stroke="var(--chart-reference)"
                      strokeDasharray="5 5"
                    />
                  ) : (
                    <ReferenceLine
                      y={0}
                      stroke="var(--chart-reference)"
                      strokeDasharray="5 5"
                    />
                  )}
                  <Tooltip
                    content={<PlayerComparisonTooltip kind={kind} />}
                    cursor={{ stroke: "var(--chart-reference)" }}
                  />
                  {options.map((series) => (
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
          </div>

          <div>
            <div className="workspace-comparison-plot-heading">
              <h5>{config.distributionTitle}</h5>
              <p>{config.distributionDescription}</p>
            </div>
            <div
              className="workspace-chart workspace-player-distribution-chart"
              role="img"
              aria-label={config.distributionAriaLabel(
                visiblePoints.length,
              )}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={distribution}
                  margin={{ top: 14, right: 10, bottom: 34, left: 0 }}
                  accessibilityLayer
                >
                  <CartesianGrid
                    stroke="var(--chart-grid)"
                    strokeDasharray="3 5"
                    vertical={false}
                  />
                  <XAxis
                    type="number"
                    dataKey="midpoint"
                    domain={differenceDomain}
                    tickFormatter={formatSignedRate}
                    tick={axisTick}
                    tickLine={false}
                    axisLine={{ stroke: "var(--chart-axis)" }}
                    label={axisLabel(
                      config.distributionAxisLabel,
                      "insideBottom",
                      -20,
                    )}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                  />
                  <ReferenceLine
                    x={0}
                    stroke="var(--chart-reference)"
                    strokeDasharray="5 5"
                  />
                  <Tooltip content={<DistributionTooltip />} />
                  <Bar
                    dataKey="count"
                    name="Players"
                    fill="var(--chart-primary)"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <p className="workspace-chart-empty">
          No qualifying player-team rows match this filter.
        </p>
      )}

      <p className="workspace-chart-coverage">
        Traded players remain split by team. The comparison and table below use
        the same qualifying rows.
      </p>

      <table className="sr-only">
        <caption>{config.title} plot values</caption>
        <thead>
          <tr>
            <th>Player</th>
            <th>Team</th>
            <th>{config.xLabel}</th>
            <th>{config.yLabel}</th>
            <th>{config.differenceLabel}</th>
          </tr>
        </thead>
        <tbody>
          {visiblePoints.map((point) => (
            <tr key={`${point.nhlPlayerId}-${point.nhlTeamId}`}>
              <td>{point.name}</td>
              <td>{point.teamAbbreviation}</td>
              <td>{formatDetailedRate(point.xValue)}</td>
              <td>{formatDetailedSignedRate(point.yValue)}</td>
              <td>{formatDetailedSignedRate(point.differenceValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function PlayerComparisonTooltip({
  active,
  payload = [],
  kind,
}: Partial<TooltipContentProps<number, string>> & {
  kind: "skater" | "goalie";
}) {
  const point = payload[0]?.payload as PlayerComparisonPoint | undefined;
  if (!active || !point) {
    return null;
  }

  return (
    <div className="workspace-chart-tooltip">
      <p className="workspace-chart-tooltip-date">
        {point.teamAbbreviation} ·{" "}
        {point.kind === "skater" ? point.position ?? "Skater" : "Goalie"}
      </p>
      <p className="workspace-chart-tooltip-game">{point.name}</p>
      <dl>
        {kind === "skater" && point.kind === "skater" ? (
          <>
            <div>
              <dt>Individual xG / 60</dt>
              <dd>{formatDetailedRate(point.xValue)}</dd>
            </div>
            <div>
              <dt>Goals / 60</dt>
              <dd>{formatDetailedRate(point.yValue)}</dd>
            </div>
            <div>
              <dt>Finishing vs. expected</dt>
              <dd>{formatDetailedSignedRate(point.differenceValue)}</dd>
            </div>
            <div>
              <dt>Goals / individual xG</dt>
              <dd>
                {point.individualGoals.toFixed(0)} /{" "}
                {point.individualExpectedGoals.toFixed(1)}
              </dd>
            </div>
          </>
        ) : null}
        {kind === "goalie" && point.kind === "goalie" ? (
          <>
            <div>
              <dt>Expected goals against / 60</dt>
              <dd>{formatDetailedRate(point.xValue)}</dd>
            </div>
            <div>
              <dt>Goals saved above expected / 60</dt>
              <dd>{formatDetailedSignedRate(point.yValue)}</dd>
            </div>
            <div>
              <dt>Total GSAx</dt>
              <dd>{formatSigned(point.goalsSavedAboveExpected)}</dd>
            </div>
            <div>
              <dt>Goals against / expected</dt>
              <dd>
                {point.goalsAgainst.toFixed(0)} /{" "}
                {point.expectedGoalsAgainst.toFixed(1)}
              </dd>
            </div>
          </>
        ) : null}
        <div>
          <dt>Games / minutes</dt>
          <dd>
            {point.gamesPlayed} / {Math.round(point.iceTimeMinutes)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function DistributionTooltip({
  active,
  payload = [],
}: Partial<TooltipContentProps<number, string>>) {
  const bin = payload[0]?.payload as DistributionBin | undefined;
  if (!active || !bin) {
    return null;
  }

  return (
    <div className="workspace-chart-tooltip">
      <p className="workspace-chart-tooltip-date">Rate range per 60</p>
      <p className="workspace-chart-tooltip-game">{bin.label}</p>
      <dl>
        <div>
          <dt>Player-team rows</dt>
          <dd>{bin.count}</dd>
        </div>
      </dl>
    </div>
  );
}

function chartAxes(
  kind: "skater" | "goalie",
  points: PlayerComparisonPoint[],
) {
  if (kind === "skater") {
    const sharedDomain = numericDomain(
      points.flatMap((point) => [point.xValue, point.yValue]),
      { matchingMinimum: 0 },
    );
    return {
      xDomain: sharedDomain,
      yDomain: sharedDomain,
    };
  }

  return {
    xDomain: numericDomain(points.map((point) => point.xValue)),
    yDomain: signedDomain(points.map((point) => point.yValue)),
  };
}

function chartConfig(kind: "skater" | "goalie") {
  if (kind === "skater") {
    return {
      title: "Scoring vs. Shot Quality",
      description:
        "Goals per 60 are compared with the expected-goal value of each skater’s shots. Above the diagonal means the player finished above expectation.",
      filterLabel: "Position",
      scatterTitle: "Expected vs. Actual Scoring",
      distributionTitle: "Finishing Distribution",
      distributionDescription:
        "How qualifying skaters are distributed above and below expected scoring.",
      xLabel: "Individual Expected Goals / 60",
      yLabel: "Goals / 60",
      differenceLabel: "Goals Minus Expected Goals / 60",
      distributionAxisLabel: "Goals Minus Expected Goals / 60",
      scatterAriaLabel: (count: number) =>
        `Scatterplot comparing expected and actual goals per 60 for ${count} qualifying skater-team rows.`,
      distributionAriaLabel: (count: number) =>
        `Distribution of finishing above and below expected for ${count} qualifying skater-team rows.`,
    };
  }

  return {
    title: "Workload vs. Results",
    description:
      "Expected goals against per 60 describes the shot-quality workload a goalie faced. Goals saved above expected per 60 measures performance relative to it.",
    filterLabel: "Performance",
    scatterTitle: "Expected Workload vs. Saves",
    distributionTitle: "GSAx Distribution",
    distributionDescription:
      "How qualifying goalies are distributed above and below expected performance.",
    xLabel: "Expected Goals Against / 60",
    yLabel: "Goals Saved Above Expected / 60",
    differenceLabel: "Goals Saved Above Expected / 60",
    distributionAxisLabel: "Goals Saved Above Expected / 60",
    scatterAriaLabel: (count: number) =>
      `Scatterplot comparing expected-goal workload and goals saved above expected per 60 for ${count} qualifying goalie-team rows.`,
    distributionAriaLabel: (count: number) =>
      `Distribution of goals saved above expected per 60 for ${count} qualifying goalie-team rows.`,
  };
}

const axisTick = {
  fill: "var(--chart-label)",
  fontSize: 11,
};

function axisLabel(
  value: string,
  position: "insideBottom" | "insideLeft",
  offset: number,
) {
  return {
    value,
    position,
    offset,
    fill: "var(--chart-label)",
    fontSize: 11,
  };
}

function formatRate(value: number) {
  return value.toFixed(1);
}

function formatSignedRate(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function formatDetailedRate(value: number) {
  return value.toFixed(2);
}

function formatDetailedSignedRate(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

function formatSigned(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}
