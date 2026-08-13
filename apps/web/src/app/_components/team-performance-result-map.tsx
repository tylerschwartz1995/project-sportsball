"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  CartesianGrid,
  ReferenceArea,
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

import { TeamLogo } from "@/app/_components/team-logo";
import { useUrlChoice } from "@/app/_components/use-shareable-state";
import {
  PERFORMANCE_RESULT_GROUPS,
  type PerformanceResultGroup,
  type PerformanceResultMap,
  type PerformanceResultPoint,
} from "@/lib/team-season-identity";

const GROUPS = [
  {
    value: "controlled-win",
    label: "Process+ wins",
    description: "50%+ share",
    color: "var(--positive)",
  },
  {
    value: "outplayed-win",
    label: "Process− wins",
    description: "Under 50% share",
    color: "var(--chart-secondary)",
  },
  {
    value: "controlled-loss",
    label: "Process+ losses",
    description: "50%+ share",
    color: "var(--chart-primary)",
  },
  {
    value: "outplayed-loss",
    label: "Process− losses",
    description: "Under 50% share",
    color: "var(--negative)",
  },
] as const satisfies ReadonlyArray<{
  value: PerformanceResultGroup;
  label: string;
  description: string;
  color: string;
}>;

type ResultMapFilter = "all" | PerformanceResultGroup;
const FILTERS = ["all", ...PERFORMANCE_RESULT_GROUPS] as const;

export function TeamPerformanceResultMap({
  data,
  phaseLabel,
}: {
  data: PerformanceResultMap;
  phaseLabel: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useUrlChoice<ResultMapFilter>(
    "resultMap",
    FILTERS,
    "all",
  );
  const visiblePoints = useMemo(
    () =>
      filter === "all"
        ? data.points
        : data.points.filter((point) => point.group === filter),
    [data.points, filter],
  );
  const xDomain = useMemo(() => playShareDomain(data.points), [data.points]);
  const yBound = useMemo(() => goalDifferentialBound(data.points), [data.points]);
  const coverageNote =
    data.gamesAnalyzed === data.totalGames
      ? `${data.gamesAnalyzed} ${phaseLabel.toLowerCase()} games plotted`
      : `${data.gamesAnalyzed} of ${data.totalGames} ${phaseLabel.toLowerCase()} games plotted; games missing ${data.metricLabel.toLowerCase()} are excluded`;

  return (
    <section className="surface-panel overflow-hidden p-5 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
            Performance vs. result
          </p>
          <h3 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-[var(--foreground)]">
            Game Results vs. Share of Play
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Each dot is one game. Right means the team controlled more of play;
            up means a better goal differential.
          </p>
        </div>
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-[var(--muted)]">
          Horizontal axis · {data.metricLabel}
        </p>
      </header>

      <div
        className="mt-5 grid grid-cols-2 gap-2 xl:grid-cols-5"
        role="group"
        aria-label="Filter games by result and share of play"
      >
        <FilterButton
          active={filter === "all"}
          count={data.points.length}
          total={data.totalGames}
          label={
            data.gamesAnalyzed === data.totalGames
              ? "All games"
              : "All plotted games"
          }
          description={
            data.gamesAnalyzed === data.totalGames
              ? "Complete sample"
              : "Covered sample"
          }
          wide
          onClick={() => setFilter("all")}
        />
        {GROUPS.map((group) => (
          <FilterButton
            key={group.value}
            active={filter === group.value}
            count={countGroup(data.points, group.value)}
            total={data.totalGames}
            label={group.label}
            description={group.description}
            color={group.color}
            onClick={() => setFilter(group.value)}
          />
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 sm:p-3">
        <div
          className="h-[22rem] w-full sm:h-[26rem]"
          role="img"
          aria-label={`Scatterplot of ${visiblePoints.length} ${phaseLabel.toLowerCase()} games by ${data.metricLabel.toLowerCase()} and goal differential.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 18, right: 18, bottom: 36, left: 12 }}
              accessibilityLayer
            >
              <CartesianGrid
                stroke="var(--chart-grid)"
                strokeDasharray="3 5"
              />
              <ReferenceArea
                x1={50}
                x2={xDomain[1]}
                y1={0}
                y2={yBound}
                fill="var(--positive)"
                fillOpacity={0.035}
                strokeOpacity={0}
                label={quadrantLabel("P+ / WIN", "insideTopRight")}
              />
              <ReferenceArea
                x1={xDomain[0]}
                x2={50}
                y1={0}
                y2={yBound}
                fill="var(--chart-secondary)"
                fillOpacity={0.035}
                strokeOpacity={0}
                label={quadrantLabel("P− / WIN", "insideTopLeft")}
              />
              <ReferenceArea
                x1={50}
                x2={xDomain[1]}
                y1={-yBound}
                y2={0}
                fill="var(--chart-primary)"
                fillOpacity={0.035}
                strokeOpacity={0}
                label={quadrantLabel("P+ / LOSS", "insideBottomRight")}
              />
              <ReferenceArea
                x1={xDomain[0]}
                x2={50}
                y1={-yBound}
                y2={0}
                fill="var(--negative)"
                fillOpacity={0.035}
                strokeOpacity={0}
                label={quadrantLabel("P− / LOSS", "insideBottomLeft")}
              />
              <XAxis
                type="number"
                dataKey="playSharePercentage"
                name={data.metricLabel}
                domain={xDomain}
                ticks={[xDomain[0], 50, xDomain[1]]}
                tickFormatter={(value: number) => `${Math.round(value)}%`}
                tick={{ fill: "var(--chart-label)", fontSize: "0.75rem" }}
                tickLine={false}
                axisLine={{ stroke: "var(--chart-axis)" }}
                label={{
                  value: data.metricLabel,
                  position: "insideBottom",
                  offset: -24,
                  fill: "var(--chart-label)",
                  fontSize: "0.75rem",
                }}
              />
              <YAxis
                type="number"
                dataKey="goalDifferential"
                name="Goal differential"
                domain={[-yBound, yBound]}
                ticks={[-yBound, 0, yBound]}
                allowDecimals={false}
                tick={{ fill: "var(--chart-label)", fontSize: "0.75rem" }}
                tickLine={false}
                axisLine={{ stroke: "var(--chart-axis)" }}
                width={42}
                label={{
                  value: "Goal differential",
                  angle: -90,
                  position: "insideLeft",
                  offset: -2,
                  fill: "var(--chart-label)",
                  fontSize: "0.75rem",
                }}
              />
              <ZAxis range={[70, 70]} />
              <ReferenceLine
                x={50}
                stroke="var(--chart-reference)"
                strokeDasharray="5 5"
              />
              <ReferenceLine
                y={0}
                stroke="var(--chart-reference)"
                strokeDasharray="5 5"
              />
              <Tooltip
                content={
                  <ResultMapTooltip
                    metric={data.metric}
                    metricLabel={data.metricLabel}
                  />
                }
                cursor={{ stroke: "var(--chart-reference)" }}
              />
              {GROUPS.map((group) => (
                <Scatter
                  key={group.value}
                  name={group.label}
                  data={visiblePoints.filter(
                    (point) => point.group === group.value,
                  )}
                  fill={group.color}
                  activeShape={{
                    stroke: "var(--foreground)",
                    strokeWidth: 2,
                  }}
                  cursor="pointer"
                  isAnimationActive={false}
                  onClick={(scatterPoint) => {
                    const point = scatterPoint.payload as
                      | PerformanceResultPoint
                      | undefined;
                    if (point) router.push(`/games/${point.nhlGameId}`);
                  }}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
        <p>{coverageNote}.</p>
        <p>Hover or tap for details; select a dot to open the game.</p>
      </div>

      <div className="sr-only">
        <table>
          <caption>Games plotted by share of play and goal differential</caption>
          <thead>
            <tr>
              <th>Game</th>
              <th>{data.metricLabel}</th>
              <th>{rawMetricLabel(data.metric)}</th>
              <th>Goal differential</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            {visiblePoints.map((point) => (
              <tr key={point.nhlGameId}>
                <td>
                  <Link href={`/games/${point.nhlGameId}`}>
                    {formatGameLabel(point)}
                  </Link>
                </td>
                <td>{formatPercentage(point.playSharePercentage)}</td>
                <td>{formatRawMetric(point, data.metric)}</td>
                <td>{formatSigned(point.goalDifferential)}</td>
                <td>{groupDefinition(point.group).label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FilterButton({
  active,
  count,
  total,
  label,
  description,
  color,
  wide = false,
  onClick,
}: {
  active: boolean;
  count: number;
  total: number;
  label: string;
  description: string;
  color?: string;
  wide?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-20 items-start gap-3 rounded-xl border p-3 text-left transition ${wide ? "col-span-2 xl:col-span-1" : ""} ${
        active
          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
      }`}
    >
      {color ? (
        <span
          aria-hidden="true"
          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: color }}
        />
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="flex flex-col gap-1 xl:flex-row xl:items-baseline xl:justify-between xl:gap-2">
          <span className="text-xs font-semibold text-[var(--foreground)]">
            {label}
          </span>
          <span className="whitespace-nowrap font-mono text-sm font-semibold text-[var(--foreground)] tabular-nums">
            {count}{" "}
            <span className="text-[0.62rem] font-medium text-[var(--muted)]">
              ({formatSamplePercentage(count, total)})
            </span>
          </span>
        </span>
        <span className="mt-1 block text-[0.68rem] leading-4 text-[var(--muted)]">
          {description}
        </span>
      </span>
    </button>
  );
}

function ResultMapTooltip({
  active,
  payload = [],
  metric,
  metricLabel,
}: Partial<TooltipContentProps<number, string>> & {
  metric: PerformanceResultMap["metric"];
  metricLabel: string;
}) {
  const point = payload[0]?.payload as PerformanceResultPoint | undefined;
  if (!active || !point) return null;

  return (
    <div className="workspace-chart-tooltip">
      <p className="workspace-chart-tooltip-date">
        {groupDefinition(point.group).label}
      </p>
      <p className="workspace-chart-tooltip-game flex items-center gap-2">
        <TeamLogo {...point.opponent} size="tiny" decorative />
        {point.score}–{point.opponentScore} {point.isHome ? "vs" : "at"}{" "}
        {point.opponent.abbreviation}
      </p>
      <dl>
        <div>
          <dt>{metricLabel}</dt>
          <dd>{formatPercentage(point.playSharePercentage)}</dd>
        </div>
        <div>
          <dt>{rawMetricLabel(metric)}</dt>
          <dd>{formatRawMetric(point, metric)}</dd>
        </div>
      </dl>
      <p className="workspace-chart-tooltip-sample">
        {formatLongDate(point.gameDate)} · Select to open game
      </p>
    </div>
  );
}

function countGroup(
  points: PerformanceResultPoint[],
  group: PerformanceResultGroup,
) {
  return points.filter((point) => point.group === group).length;
}

function groupDefinition(group: PerformanceResultGroup) {
  return GROUPS.find((definition) => definition.value === group)!;
}

function playShareDomain(
  points: PerformanceResultPoint[],
): [number, number] {
  const furthestFromEven = Math.max(
    10,
    ...points.map((point) => Math.abs(point.playSharePercentage - 50)),
  );
  const extent = Math.ceil((furthestFromEven + 2) / 5) * 5;
  return [Math.max(0, 50 - extent), Math.min(100, 50 + extent)];
}

function goalDifferentialBound(points: PerformanceResultPoint[]) {
  return Math.max(
    2,
    ...points.map((point) => Math.abs(point.goalDifferential)),
  );
}

function quadrantLabel(
  value: string,
  position:
    | "insideTopRight"
    | "insideTopLeft"
    | "insideBottomRight"
    | "insideBottomLeft",
) {
  return {
    value,
    position,
    fill: "var(--chart-label)",
    fontSize: "0.62rem",
    letterSpacing: "0.08em",
  } as const;
}

function formatGameLabel(point: PerformanceResultPoint) {
  return `${point.score}–${point.opponentScore} ${point.isHome ? "vs" : "at"} ${point.opponent.name} on ${formatLongDate(point.gameDate)}`;
}

function formatPercentage(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatSamplePercentage(count: number, total: number) {
  if (total === 0) return "0%";
  const percentage = (count / total) * 100;
  return `${Math.round(percentage)}%`;
}

function rawMetricLabel(metric: PerformanceResultMap["metric"]) {
  return metric === "expected-goal-share"
    ? "Five-on-five expected goals"
    : "Shots on goal";
}

function formatRawMetric(
  point: PerformanceResultPoint,
  metric: PerformanceResultMap["metric"],
) {
  const decimals = metric === "expected-goal-share" ? 2 : 0;
  return `${point.playForValue.toFixed(decimals)}–${point.playAgainstValue.toFixed(decimals)}`;
}

function formatSigned(value: number) {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "−"}${Math.abs(value)}`;
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
