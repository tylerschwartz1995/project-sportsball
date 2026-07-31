"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import {
  buildRollingTeamPerformance,
  TEAM_PERFORMANCE_WINDOWS,
  type RollingTeamPerformancePoint,
  type TeamPerformanceGame,
  type TeamPerformanceWindow,
} from "@/lib/team-performance";

type TeamRollingPerformanceChartProps = {
  games: TeamPerformanceGame[];
  teamName: string;
};

export function TeamRollingPerformanceChart({
  games,
  teamName,
}: TeamRollingPerformanceChartProps) {
  const [windowSize, setWindowSize] = useState<TeamPerformanceWindow>(10);
  const data = useMemo(
    () => buildRollingTeamPerformance(games, windowSize),
    [games, windowSize],
  );
  const hasExpectedGoalData = data.some(
    (point) => point.fiveOnFiveExpectedGoalSharePercentage !== null,
  );

  if (data.length === 0) {
    return (
      <div className="workspace-chart-empty">
        No completed games are stored for this season phase.
      </div>
    );
  }

  return (
    <>
      <div className="workspace-chart-toolbar">
        <p>
          Each point summarizes up to the selected number of games ending on
          that date.
        </p>
        <div aria-label="Rolling game window" className="workspace-chart-window">
          {TEAM_PERFORMANCE_WINDOWS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={windowSize === option}
              onClick={() => setWindowSize(option)}
            >
              {option} Games
            </button>
          ))}
        </div>
      </div>

      <div
        className="workspace-chart"
        role="img"
        aria-label={`${teamName} rolling goal share and five-on-five expected-goal share over ${windowSize} games. A value above 50 percent means the team produced more than its opponent.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 14, right: 18, bottom: 4, left: -8 }}
            accessibilityLayer
          >
            <CartesianGrid
              stroke="var(--chart-grid)"
              strokeDasharray="3 5"
              vertical={false}
            />
            <XAxis
              dataKey="gameDate"
              tickFormatter={formatAxisDate}
              stroke="var(--chart-axis)"
              tick={{ fill: "var(--chart-label)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--chart-axis)" }}
              interval="preserveStartEnd"
              minTickGap={34}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(value: number) => `${value}%`}
              stroke="var(--chart-axis)"
              tick={{ fill: "var(--chart-label)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <ReferenceLine
              y={50}
              stroke="var(--chart-reference)"
              strokeDasharray="5 5"
              label={{
                value: "50%",
                position: "insideTopLeft",
                fill: "var(--chart-label)",
                fontSize: 11,
              }}
            />
            <Tooltip
              content={PerformanceTooltip}
              cursor={{ stroke: "var(--chart-reference)", strokeWidth: 1 }}
              isAnimationActive="auto"
            />
            <Legend
              iconType="plainline"
              formatter={(value) => (
                <span className="workspace-chart-legend-label">{value}</span>
              )}
            />
            <Line
              type="monotone"
              dataKey="goalSharePercentage"
              name="Goal Share"
              stroke="var(--chart-primary)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
            />
            {hasExpectedGoalData ? (
              <Line
                type="monotone"
                dataKey="fiveOnFiveExpectedGoalSharePercentage"
                name="5v5 Expected-Goal Share"
                stroke="var(--chart-secondary)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2 }}
                connectNulls
                isAnimationActive={false}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {!hasExpectedGoalData ? (
        <p className="workspace-chart-coverage">
          Five-on-five expected-goal data is not available for this season
          phase, so only actual goal share is shown.
        </p>
      ) : null}

      <table className="sr-only">
        <caption>
          {teamName} rolling performance, using up to {windowSize} games per
          point
        </caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Opponent</th>
            <th>Result</th>
            <th>Goal Share</th>
            <th>5v5 Expected-Goal Share</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.nhlGameId}>
              <td>{formatFullDate(point.gameDate)}</td>
              <td>
                {point.venueLabel} {point.opponentName}
              </td>
              <td>
                {point.result} {point.scoreLabel}
              </td>
              <td>{formatPercentage(point.goalSharePercentage)}</td>
              <td>
                {formatPercentage(
                  point.fiveOnFiveExpectedGoalSharePercentage,
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function PerformanceTooltip({
  active,
  payload,
}: TooltipContentProps) {
  const point = payload[0]?.payload as
    | RollingTeamPerformancePoint
    | undefined;
  if (!active || !point) {
    return null;
  }

  return (
    <div className="workspace-chart-tooltip">
      <p className="workspace-chart-tooltip-date">
        {formatFullDate(point.gameDate)}
      </p>
      <p className="workspace-chart-tooltip-game">
        {point.result} {point.scoreLabel} · {point.venueLabel}{" "}
        {point.opponentAbbreviation}
      </p>
      <dl>
        <div>
          <dt>Goal Share</dt>
          <dd>{formatPercentage(point.goalSharePercentage)}</dd>
        </div>
        <div>
          <dt>5v5 xG Share</dt>
          <dd>
            {formatPercentage(
              point.fiveOnFiveExpectedGoalSharePercentage,
            )}
          </dd>
        </div>
      </dl>
      <p className="workspace-chart-tooltip-sample">
        {point.sampleSize}-game actual sample · {point.advancedSampleSize}-game
        xG sample
      </p>
    </div>
  );
}

function formatAxisDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(dateOnly(value));
}

function formatFullDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateOnly(value));
}

function dateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00Z`);
}

function formatPercentage(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}
