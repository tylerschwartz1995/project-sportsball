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
  ChartFilterButton,
  ChartFilterGroup,
} from "@/app/_components/chart-controls";
import { TeamLogo } from "@/app/_components/team-logo";
import {
  buildRollingTeamPerformance,
  type RollingTeamPerformancePoint,
  type TeamPerformanceGame,
} from "@/lib/team-performance";
import {
  filterGamesByVenue,
  ROLLING_WINDOWS,
  type PerformanceVenue,
  type RollingWindow,
} from "@/lib/rolling-performance";

type TeamRollingPerformanceChartProps = {
  games: TeamPerformanceGame[];
  teamName: string;
};

export function TeamRollingPerformanceChart({
  games,
  teamName,
}: TeamRollingPerformanceChartProps) {
  const [windowSize, setWindowSize] = useState<RollingWindow>(10);
  const [venue, setVenue] = useState<PerformanceVenue>("all");
  const [showGoalShare, setShowGoalShare] = useState(true);
  const [showExpectedGoalShare, setShowExpectedGoalShare] = useState(true);
  const filteredGames = useMemo(
    () => filterGamesByVenue(games, venue),
    [games, venue],
  );
  const data = useMemo(
    () => buildRollingTeamPerformance(filteredGames, windowSize),
    [filteredGames, windowSize],
  );
  const hasExpectedGoalData = data.some(
    (point) => point.fiveOnFiveExpectedGoalSharePercentage !== null,
  );
  const effectiveShowExpectedGoalShare =
    showExpectedGoalShare && hasExpectedGoalData;
  const effectiveShowGoalShare =
    showGoalShare || !effectiveShowExpectedGoalShare;

  if (games.length === 0) {
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
          Filters are applied before each rolling window is calculated. For
          example, 10 Away Games means the team&apos;s latest 10 away games.
        </p>
        <div className="workspace-chart-filters">
          <ChartFilterGroup label="Window">
            {ROLLING_WINDOWS.map((option) => (
              <ChartFilterButton
                key={option}
                active={windowSize === option}
                label={`${option} Games`}
                onClick={() => setWindowSize(option)}
              />
            ))}
          </ChartFilterGroup>

          <ChartFilterGroup label="Venue">
            {(
              [
                ["all", "All"],
                ["home", "Home"],
                ["away", "Away"],
              ] as const
            ).map(([value, label]) => (
              <ChartFilterButton
                key={value}
                active={venue === value}
                label={label}
                onClick={() => setVenue(value)}
              />
            ))}
          </ChartFilterGroup>

          <ChartFilterGroup label="Series">
            <ChartFilterButton
              active={effectiveShowGoalShare}
              disabled={
                effectiveShowGoalShare &&
                !effectiveShowExpectedGoalShare
              }
              label="Goals"
              onClick={() => setShowGoalShare((visible) => !visible)}
            />
            <ChartFilterButton
              active={effectiveShowExpectedGoalShare}
              disabled={
                !hasExpectedGoalData ||
                (effectiveShowExpectedGoalShare &&
                  !effectiveShowGoalShare)
              }
              label="5v5 xG"
              onClick={() =>
                setShowExpectedGoalShare((visible) => !visible)
              }
            />
          </ChartFilterGroup>
        </div>
      </div>

      {data.length > 0 ? (
        <div
          className="workspace-chart"
          role="img"
          aria-label={chartAriaLabel({
            teamName,
            windowSize,
            venue,
            showGoalShare: effectiveShowGoalShare,
            showExpectedGoalShare: effectiveShowExpectedGoalShare,
          })}
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
                tick={{ fill: "var(--chart-label)", fontSize: 13 }}
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
                tick={{ fill: "var(--chart-label)", fontSize: 13 }}
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
                  fontSize: 12,
                }}
              />
              <Tooltip
                content={
                  <PerformanceTooltip
                    showGoalShare={effectiveShowGoalShare}
                    showExpectedGoalShare={
                      effectiveShowExpectedGoalShare
                    }
                  />
                }
                cursor={{
                  stroke: "var(--chart-reference)",
                  strokeWidth: 1,
                }}
                isAnimationActive="auto"
              />
              <Legend
                iconType="plainline"
                formatter={(value) => (
                  <span className="workspace-chart-legend-label">
                    {value}
                  </span>
                )}
              />
              {effectiveShowGoalShare ? (
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
              ) : null}
              {effectiveShowExpectedGoalShare ? (
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
      ) : (
        <div className="workspace-chart-empty">
          No completed {venue} games are stored for this season phase.
        </div>
      )}
      {data.length > 0 && !hasExpectedGoalData ? (
        <p className="workspace-chart-coverage">
          Five-on-five expected-goal data is not available for this season
          phase, so only actual goal share is shown.
        </p>
      ) : null}

      <div className="sr-only">
        <table>
        <caption>
          {teamName} rolling {venue === "all" ? "" : `${venue} `}performance,
          using up to {windowSize} games per point
        </caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Opponent</th>
            <th>Result</th>
            {effectiveShowGoalShare ? <th>Goal Share</th> : null}
            {effectiveShowExpectedGoalShare ? (
              <th>5v5 Expected-Goal Share</th>
            ) : null}
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
              {effectiveShowGoalShare ? (
                <td>{formatPercentage(point.goalSharePercentage)}</td>
              ) : null}
              {effectiveShowExpectedGoalShare ? (
                <td>
                  {formatPercentage(
                    point.fiveOnFiveExpectedGoalSharePercentage,
                  )}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </>
  );
}

type PerformanceTooltipProps = Partial<TooltipContentProps> & {
  showGoalShare: boolean;
  showExpectedGoalShare: boolean;
};

function PerformanceTooltip({
  active,
  payload = [],
  showGoalShare,
  showExpectedGoalShare,
}: PerformanceTooltipProps) {
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
      <p className="workspace-chart-tooltip-game flex items-center gap-1.5">
        <span>{point.result} {point.scoreLabel} · {point.venueLabel}</span>
        <TeamLogo
          abbreviation={point.opponentAbbreviation}
          size="tiny"
          decorative
        />
        <span>{point.opponentAbbreviation}</span>
      </p>
      <dl>
        {showGoalShare ? (
          <div>
            <dt>Goal Share</dt>
            <dd>{formatPercentage(point.goalSharePercentage)}</dd>
          </div>
        ) : null}
        {showExpectedGoalShare ? (
          <div>
            <dt>5v5 xG Share</dt>
            <dd>
              {formatPercentage(
                point.fiveOnFiveExpectedGoalSharePercentage,
              )}
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="workspace-chart-tooltip-sample">
        {point.sampleSize}-game actual sample · {point.advancedSampleSize}-game
        xG sample
      </p>
    </div>
  );
}

function chartAriaLabel({
  teamName,
  windowSize,
  venue,
  showGoalShare,
  showExpectedGoalShare,
}: {
  teamName: string;
  windowSize: RollingWindow;
  venue: PerformanceVenue;
  showGoalShare: boolean;
  showExpectedGoalShare: boolean;
}): string {
  const series = [
    showGoalShare ? "goal share" : null,
    showExpectedGoalShare ? "five-on-five expected-goal share" : null,
  ].filter(Boolean);
  const venueLabel =
    venue === "all" ? "all games" : `${venue} games`;

  return `${teamName} rolling ${series.join(" and ")} over ${windowSize} ${venueLabel}. A value above 50 percent means the team produced more than its opponent.`;
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
