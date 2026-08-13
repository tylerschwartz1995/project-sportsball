"use client";

import { useMemo } from "react";
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
import { TeamLogo } from "@/app/_components/team-logo";
import { CopyViewLink } from "@/app/_components/copy-view-link";
import { useUrlChoice } from "@/app/_components/use-shareable-state";
import {
  buildDistribution,
  buildPlotPoints,
  filterPlayerComparisonPoints,
  metricValue,
  numericDomain,
  playerPointKey,
  signedDomain,
  type DistributionBin,
  type GoalieComparisonPoint,
  type PlayerComparisonGroup,
  type PlayerComparisonPoint,
  type PlayerMetricKey,
  type PlotPoint,
  type SkaterComparisonPoint,
} from "@/lib/player-comparison";
import { formatPlayerPosition } from "@/lib/player-position";

type PlayerComparisonPlotsProps =
  | {
      kind: "skater";
      points: SkaterComparisonPoint[];
    }
  | {
      kind: "goalie";
      points: GoalieComparisonPoint[];
    };

type MetricUnit = "rate" | "signedRate" | "percentage";

type MetricDefinition = {
  key: PlayerMetricKey;
  label: string;
  shortLabel: string;
  unit: MetricUnit;
  referenceValue?: number;
  comparisonFamily?: string;
};

const SKATER_METRICS: MetricDefinition[] = [
  {
    key: "individualExpectedGoalsPer60",
    label: "Individual Expected Goals / 60",
    shortLabel: "Individual xG / 60",
    unit: "rate",
    comparisonFamily: "scoring",
  },
  {
    key: "goalsPer60",
    label: "Goals / 60",
    shortLabel: "Goals / 60",
    unit: "rate",
    comparisonFamily: "scoring",
  },
  {
    key: "pointsPer60",
    label: "Points / 60",
    shortLabel: "Points / 60",
    unit: "rate",
  },
  {
    key: "gameScorePer60",
    label: "Game Score / 60",
    shortLabel: "Game Score / 60",
    unit: "signedRate",
    referenceValue: 0,
  },
  {
    key: "onIceExpectedGoalsPercentage",
    label: "On-Ice Expected-Goal Share",
    shortLabel: "On-Ice xG%",
    unit: "percentage",
    referenceValue: 50,
  },
  {
    key: "onIceCorsiPercentage",
    label: "On-Ice Corsi Share",
    shortLabel: "On-Ice CF%",
    unit: "percentage",
    referenceValue: 50,
  },
  {
    key: "onIceFenwickPercentage",
    label: "On-Ice Fenwick Share",
    shortLabel: "On-Ice FF%",
    unit: "percentage",
    referenceValue: 50,
  },
];

const GOALIE_METRICS: MetricDefinition[] = [
  {
    key: "expectedGoalsAgainstPer60",
    label: "Expected Goals Against / 60",
    shortLabel: "xGA / 60",
    unit: "rate",
    comparisonFamily: "goalsAgainst",
  },
  {
    key: "goalsAgainstPer60",
    label: "Goals Against / 60",
    shortLabel: "GA / 60",
    unit: "rate",
    comparisonFamily: "goalsAgainst",
  },
  {
    key: "goalsSavedAboveExpectedPer60",
    label: "Goals Saved Above Expected / 60",
    shortLabel: "GSAx / 60",
    unit: "signedRate",
    referenceValue: 0,
  },
  {
    key: "expectedShotsOnGoalAgainstPer60",
    label: "Expected Shots on Goal Against / 60",
    shortLabel: "Expected SOG / 60",
    unit: "rate",
    comparisonFamily: "shotsAgainst",
  },
  {
    key: "shotsOnGoalAgainstPer60",
    label: "Shots on Goal Against / 60",
    shortLabel: "SOG / 60",
    unit: "rate",
    comparisonFamily: "shotsAgainst",
  },
];

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
  const metrics = kind === "skater" ? SKATER_METRICS : GOALIE_METRICS;
  const groupOptions =
    kind === "skater" ? SKATER_GROUPS : GOALIE_GROUPS;
  const defaultX = kind === "skater" ? "individualExpectedGoalsPer60" : "expectedGoalsAgainstPer60";
  const defaultY = kind === "skater" ? "goalsPer60" : "goalsSavedAboveExpectedPer60";
  const [group, setGroup] = useUrlChoice<PlayerComparisonGroup>("plotGroup", groupOptions.map((option) => option.value), "all");
  const [xMetric, setXMetric] = useUrlChoice<PlayerMetricKey>("xMetric", metrics.map((metric) => metric.key), defaultX);
  const [yMetric, setYMetric] = useUrlChoice<PlayerMetricKey>("yMetric", metrics.map((metric) => metric.key), defaultY);
  const xDefinition = definitionFor(metrics, xMetric);
  const yDefinition = definitionFor(metrics, yMetric);
  const groupedPoints = useMemo(
    () => filterPlayerComparisonPoints(allPoints, group),
    [allPoints, group],
  );
  const allPlotPoints = useMemo(
    () => buildPlotPoints(allPoints, xMetric, yMetric),
    [allPoints, xMetric, yMetric],
  );
  const visiblePoints = useMemo(
    () => buildPlotPoints(groupedPoints, xMetric, yMetric),
    [groupedPoints, xMetric, yMetric],
  );
  const axes = useMemo(
    () =>
      chartAxes(
        allPlotPoints,
        xDefinition,
        yDefinition,
      ),
    [allPlotPoints, xDefinition, yDefinition],
  );
  const distribution = useMemo(
    () =>
      buildDistribution(
        visiblePoints.map((point) => point.yValue),
        axes.yDomain,
        9,
      ),
    [axes.yDomain, visiblePoints],
  );
  const diagonal = sharesComparisonFamily(xDefinition, yDefinition);

  if (points.length === 0) {
    return null;
  }

  return (
    <>
      <section className="workspace-chart-panel workspace-comparison-panel">
        <header className="workspace-player-chart-header">
          <div>
            <p>
              {kind === "skater"
                ? "Skater comparison"
                : "Goalie comparison"}
            </p>
            <h4>Explore Player Relationships</h4>
          </div>
          <p>
            Select any two metrics to explore how qualifying players compare.
            The distribution follows the vertical-axis metric.
          </p>
        </header>

        <div className="workspace-player-plot-controls">
          <label>
            Horizontal axis
            <select
              value={xMetric}
              onChange={(event) =>
                setXMetric(event.target.value as PlayerMetricKey)
              }
            >
              {metrics.map((metric) => (
                <option key={metric.key} value={metric.key}>
                  {metric.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setXMetric(yMetric);
              setYMetric(xMetric);
            }}
          >
            Swap Axes
          </button>
          <label>
            Vertical axis
            <select
              value={yMetric}
              onChange={(event) =>
                setYMetric(event.target.value as PlayerMetricKey)
              }
            >
              {metrics.map((metric) => (
                <option key={metric.key} value={metric.key}>
                  {metric.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="workspace-chart-toolbar">
          <CopyViewLink />
          <p>
            Counting metrics are normalized per 60 minutes. Share metrics
            retain their percentage scale.
          </p>
          <div className="workspace-chart-filters">
            <ChartFilterGroup
              label={kind === "skater" ? "Position" : "GSAx performance"}
            >
              <ChartFilterButton
                active={group === "all"}
                label="All"
                onClick={() => setGroup("all")}
              />
              {groupOptions.map((option) => (
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
                <h5>
                  {yDefinition.shortLabel} vs. {xDefinition.shortLabel}
                </h5>
                <p>
                  Hover or tap a point for both values and player context.
                </p>
              </div>
              <div
                className="workspace-chart workspace-player-comparison-chart"
                role="img"
                aria-label={`Scatterplot comparing ${xDefinition.label} and ${yDefinition.label} for ${visiblePoints.length} qualifying player-team rows.`}
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
                      domain={axes.xDomain}
                      tickFormatter={(value) =>
                        formatMetric(value, xDefinition, 1)
                      }
                      tick={axisTick}
                      tickLine={false}
                      axisLine={{ stroke: "var(--chart-axis)" }}
                      label={axisLabel(
                        xDefinition.shortLabel,
                        "insideBottom",
                        -20,
                      )}
                    />
                    <YAxis
                      type="number"
                      dataKey="yValue"
                      domain={axes.yDomain}
                      tickFormatter={(value) =>
                        formatMetric(value, yDefinition, 1)
                      }
                      tick={axisTick}
                      tickLine={false}
                      axisLine={{ stroke: "var(--chart-axis)" }}
                      width={58}
                      label={{
                        ...axisLabel(
                          yDefinition.shortLabel,
                          "insideLeft",
                          -8,
                        ),
                        angle: -90,
                      }}
                    />
                    <ZAxis range={[78, 78]} />
                    {diagonal ? (
                      <ReferenceLine
                        segment={[
                          {
                            x: axes.xDomain[0],
                            y: axes.yDomain[0],
                          },
                          {
                            x: axes.xDomain[1],
                            y: axes.yDomain[1],
                          },
                        ]}
                        stroke="var(--chart-reference)"
                        strokeDasharray="5 5"
                      />
                    ) : null}
                    {xDefinition.referenceValue !== undefined ? (
                      <ReferenceLine
                        x={xDefinition.referenceValue}
                        stroke="var(--chart-reference)"
                        strokeDasharray="5 5"
                      />
                    ) : null}
                    {yDefinition.referenceValue !== undefined ? (
                      <ReferenceLine
                        y={yDefinition.referenceValue}
                        stroke="var(--chart-reference)"
                        strokeDasharray="5 5"
                      />
                    ) : null}
                    <Tooltip
                      content={
                        <PlayerMetricTooltip
                          xDefinition={xDefinition}
                          yDefinition={yDefinition}
                        />
                      }
                      cursor={{ stroke: "var(--chart-reference)" }}
                    />
                    {groupOptions.map((series) => (
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
                <h5>{yDefinition.shortLabel} Distribution</h5>
                <p>
                  The shape of the selected vertical metric across the filtered
                  population.
                </p>
              </div>
              <div
                className="workspace-chart workspace-player-distribution-chart"
                role="img"
                aria-label={`Distribution of ${yDefinition.label} for ${visiblePoints.length} qualifying player-team rows.`}
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
                      dataKey="midpoint"
                      domain={axes.yDomain}
                      tickFormatter={(value) =>
                        formatMetric(value, yDefinition, 1)
                      }
                      tick={axisTick}
                      tickLine={false}
                      axisLine={{ stroke: "var(--chart-axis)" }}
                      label={axisLabel(
                        yDefinition.shortLabel,
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
                    <Tooltip
                      content={
                        <DistributionTooltip definition={yDefinition} />
                      }
                    />
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
            No qualifying player-team rows contain both selected metrics.
          </p>
        )}

        <p className="workspace-chart-coverage">
          Traded players remain split by team. Axes remain fixed while
          filtering so player positions do not shift with the population.
        </p>

        <div className="sr-only">
          <table>
          <caption>Selected player plot values</caption>
          <thead>
            <tr>
              <th>Player</th>
              <th>Team</th>
              <th>{xDefinition.label}</th>
              <th>{yDefinition.label}</th>
            </tr>
          </thead>
          <tbody>
            {visiblePoints.map((point) => (
              <tr key={playerPointKey(point)}>
                <td>{point.name}</td>
                <td>{point.teamAbbreviation}</td>
                <td>{formatMetric(point.xValue, xDefinition)}</td>
                <td>{formatMetric(point.yValue, yDefinition)}</td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </section>

      <DirectPlayerComparison
        points={allPoints}
        metrics={metrics}
        kind={kind}
      />
    </>
  );
}

function DirectPlayerComparison({
  points,
  metrics,
  kind,
}: {
  points: PlayerComparisonPoint[];
  metrics: MetricDefinition[];
  kind: "skater" | "goalie";
}) {
  const sortedPoints = useMemo(
    () =>
      [...points].sort(
        (left, right) =>
          left.name.localeCompare(right.name) ||
          left.teamAbbreviation.localeCompare(right.teamAbbreviation),
      ),
    [points],
  );
  const playerKeys = ["", ...sortedPoints.map(playerPointKey)];
  const [firstKey, setFirstKey] = useUrlChoice("playerA", playerKeys, "");
  const [secondKey, setSecondKey] = useUrlChoice("playerB", playerKeys, "");
  const first = sortedPoints.find(
    (point) => playerPointKey(point) === firstKey,
  );
  const second = sortedPoints.find(
    (point) => playerPointKey(point) === secondKey,
  );

  return (
    <section className="workspace-direct-comparison">
      <header>
        <div>
          <p>Direct comparison</p>
          <h4>Compare Two {kind === "skater" ? "Skaters" : "Goalies"}</h4>
        </div>
        <p>
          Select two qualifying player-team rows to compare every available
          metric on the same scale.
        </p>
      </header>

      <div className="workspace-direct-comparison-selectors">
        <PlayerSelector
          label="Player A"
          value={firstKey}
          points={sortedPoints}
          disabledKey={secondKey}
          onChange={setFirstKey}
        />
        <PlayerSelector
          label="Player B"
          value={secondKey}
          points={sortedPoints}
          disabledKey={firstKey}
          onChange={setSecondKey}
        />
      </div>

      {first && second ? (
        <div className="workspace-direct-comparison-table">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>
                  <span className="workspace-direct-comparison-identity">
                    <span>{first.name}</span>
                    <span className="workspace-direct-comparison-identity-meta">
                      <TeamLogo
                        nhlTeamId={first.nhlTeamId}
                        abbreviation={first.teamAbbreviation}
                        size="tiny"
                        decorative
                      />
                      {first.teamAbbreviation}
                    </span>
                  </span>
                </th>
                <th>
                  <span className="workspace-direct-comparison-identity">
                    <span>{second.name}</span>
                    <span className="workspace-direct-comparison-identity-meta">
                      <TeamLogo
                        nhlTeamId={second.nhlTeamId}
                        abbreviation={second.teamAbbreviation}
                        size="tiny"
                        decorative
                      />
                      {second.teamAbbreviation}
                    </span>
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
                <th>Minutes</th>
                <td>{Math.round(first.iceTimeMinutes).toLocaleString("en-CA")}</td>
                <td>{Math.round(second.iceTimeMinutes).toLocaleString("en-CA")}</td>
              </tr>
              {metrics.map((metric) => (
                <tr key={metric.key}>
                  <th>{metric.label}</th>
                  <td>{formatOptionalMetric(first, metric)}</td>
                  <td>{formatOptionalMetric(second, metric)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="workspace-direct-comparison-empty">
          Choose two players to reveal their side-by-side comparison.
        </p>
      )}
    </section>
  );
}

function PlayerSelector({
  label,
  value,
  points,
  disabledKey,
  onChange,
}: {
  label: string;
  value: string;
  points: PlayerComparisonPoint[];
  disabledKey: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select a player</option>
        {points.map((point) => {
          const key = playerPointKey(point);
          return (
            <option key={key} value={key} disabled={key === disabledKey}>
              {point.name} — {point.teamAbbreviation}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function PlayerMetricTooltip({
  active,
  payload = [],
  xDefinition,
  yDefinition,
}: Partial<TooltipContentProps<number, string>> & {
  xDefinition: MetricDefinition;
  yDefinition: MetricDefinition;
}) {
  const point = payload[0]?.payload as PlotPoint | undefined;
  if (!active || !point) {
    return null;
  }

  return (
    <div className="workspace-chart-tooltip">
      <p className="workspace-chart-tooltip-date">
        <span className="inline-flex items-center gap-1.5">
          <TeamLogo
            nhlTeamId={point.nhlTeamId}
            abbreviation={point.teamAbbreviation}
            size="tiny"
            decorative
          />
          {point.teamAbbreviation}
        </span>{" "}
        ·{" "}
        {point.kind === "skater"
          ? formatPlayerPosition(point.position, "Skater")
          : "Goalie"}
      </p>
      <p className="workspace-chart-tooltip-game">{point.name}</p>
      <dl>
        <div>
          <dt>{xDefinition.shortLabel}</dt>
          <dd>{formatMetric(point.xValue, xDefinition)}</dd>
        </div>
        <div>
          <dt>{yDefinition.shortLabel}</dt>
          <dd>{formatMetric(point.yValue, yDefinition)}</dd>
        </div>
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
  definition,
}: Partial<TooltipContentProps<number, string>> & {
  definition: MetricDefinition;
}) {
  const bin = payload[0]?.payload as DistributionBin | undefined;
  if (!active || !bin) {
    return null;
  }

  return (
    <div className="workspace-chart-tooltip">
      <p className="workspace-chart-tooltip-date">{definition.shortLabel}</p>
      <p className="workspace-chart-tooltip-game">
        {formatMetric(bin.minimum, definition)} to{" "}
        {formatMetric(bin.maximum, definition)}
      </p>
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
  points: PlotPoint[],
  xDefinition: MetricDefinition,
  yDefinition: MetricDefinition,
) {
  if (sharesComparisonFamily(xDefinition, yDefinition)) {
    const sharedDomain = metricDomain(
      points.flatMap((point) => [point.xValue, point.yValue]),
      xDefinition,
    );
    return {
      xDomain: sharedDomain,
      yDomain: sharedDomain,
    };
  }

  return {
    xDomain: metricDomain(
      points.map((point) => point.xValue),
      xDefinition,
    ),
    yDomain: metricDomain(
      points.map((point) => point.yValue),
      yDefinition,
    ),
  };
}

function metricDomain(
  values: number[],
  definition: MetricDefinition,
): [number, number] {
  if (definition.unit === "signedRate") {
    return signedDomain(values);
  }
  return numericDomain(values, {
    includeValues:
      definition.referenceValue === undefined
        ? undefined
        : [definition.referenceValue],
  });
}

function sharesComparisonFamily(
  left: MetricDefinition,
  right: MetricDefinition,
) {
  return Boolean(
    left.key !== right.key &&
      left.comparisonFamily &&
      left.comparisonFamily === right.comparisonFamily,
  );
}

function definitionFor(
  metrics: MetricDefinition[],
  key: PlayerMetricKey,
): MetricDefinition {
  return metrics.find((metric) => metric.key === key) ?? metrics[0];
}

function formatOptionalMetric(
  point: PlayerComparisonPoint,
  definition: MetricDefinition,
) {
  const value = metricValue(point, definition.key);
  return value === undefined ? "—" : formatMetric(value, definition);
}

function formatMetric(
  value: number,
  definition: MetricDefinition,
  digits = 2,
) {
  const sign =
    definition.unit === "signedRate" && value > 0 ? "+" : "";
  const suffix = definition.unit === "percentage" ? "%" : "";
  return `${sign}${value.toFixed(digits)}${suffix}`;
}

const axisTick = {
  fill: "var(--chart-label)",
  fontSize: "0.84rem",
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
    fontSize: "0.78rem",
  };
}
