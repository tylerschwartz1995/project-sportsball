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
import {
  buildRollingGoaliePerformance,
  buildRollingSkaterPerformance,
  type GoaliePerformanceGame,
  type SkaterPerformanceGame,
} from "@/lib/player-performance";
import {
  filterGamesByVenue,
  ROLLING_WINDOWS,
  type PerformanceVenue,
  type RollingWindow,
} from "@/lib/rolling-performance";

type PlayerRollingPerformanceChartProps =
  | {
      kind: "skater";
      games: SkaterPerformanceGame[];
      playerName: string;
    }
  | {
      kind: "goalie";
      games: GoaliePerformanceGame[];
      playerName: string;
    };

type PlayerPerformanceChartPoint = {
  nhlGameId: number;
  gameDate: string;
  teamAbbreviation: string;
  opponentAbbreviation: string;
  opponentName: string;
  venueLabel: "vs" | "at";
  scoreLabel: string;
  sampleSize: number;
  advancedSampleSize: number;
  primaryValue: number | null;
  advancedValue: number | null;
};

export function PlayerRollingPerformanceChart(
  props: PlayerRollingPerformanceChartProps,
) {
  const { kind, games, playerName } = props;
  const [windowSize, setWindowSize] = useState<RollingWindow>(10);
  const [venue, setVenue] = useState<PerformanceVenue>("all");
  const [showPrimary, setShowPrimary] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(true);
  const data = useMemo<PlayerPerformanceChartPoint[]>(() => {
    if (kind === "skater") {
      return buildRollingSkaterPerformance(
        filterGamesByVenue(games as SkaterPerformanceGame[], venue),
        windowSize,
      ).map((point) => ({
        ...point,
        primaryValue: point.pointsPerGame,
        advancedValue: point.individualExpectedGoalsPerGame,
      }));
    }

    return buildRollingGoaliePerformance(
      filterGamesByVenue(games as GoaliePerformanceGame[], venue),
      windowSize,
    ).map((point) => ({
      ...point,
      primaryValue: point.savePercentage,
      advancedValue: point.goalsSavedAboveExpectedPerGame,
    }));
  }, [games, kind, venue, windowSize]);
  const hasAdvancedData = data.some(
    (point) => point.advancedValue !== null,
  );
  const effectiveShowAdvanced = showAdvanced && hasAdvancedData;
  const effectiveShowPrimary = showPrimary || !effectiveShowAdvanced;
  const config = chartConfig(kind);

  if (games.length === 0) {
    return null;
  }

  return (
    <div className="workspace-chart-panel">
      <header className="workspace-player-chart-header">
        <div>
          <p>{kind === "skater" ? "Skater trend" : "Goalie trend"}</p>
          <h4>{config.title}</h4>
        </div>
        <p>{config.description}</p>
      </header>

      <div className="workspace-chart-toolbar">
        <p>
          Filters are applied before the rolling rates are calculated. Early
          points use the games available at that point in the season.
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
              active={effectiveShowPrimary}
              disabled={
                effectiveShowPrimary && !effectiveShowAdvanced
              }
              label={config.primaryShortLabel}
              onClick={() => setShowPrimary((visible) => !visible)}
            />
            <ChartFilterButton
              active={effectiveShowAdvanced}
              disabled={
                !hasAdvancedData ||
                (effectiveShowAdvanced && !effectiveShowPrimary)
              }
              label={config.advancedShortLabel}
              onClick={() => setShowAdvanced((visible) => !visible)}
            />
          </ChartFilterGroup>
        </div>
      </div>

      {data.length > 0 ? (
        <div
          className="workspace-chart"
          role="img"
          aria-label={`${playerName} rolling ${[
            effectiveShowPrimary
              ? config.primaryLabel.toLowerCase()
              : null,
            effectiveShowAdvanced
              ? config.advancedLabel.toLowerCase()
              : null,
          ]
            .filter(Boolean)
            .join(" and ")} over ${windowSize} ${
            venue === "all" ? "all games" : `${venue} games`
          }.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 14, right: 4, bottom: 4, left: -8 }}
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
                yAxisId="primary"
                hide={!effectiveShowPrimary}
                domain={["auto", "auto"]}
                tickFormatter={config.primaryAxisFormatter}
                tick={{
                  fill: "var(--chart-primary)",
                  fontSize: 11,
                }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <YAxis
                yAxisId="advanced"
                hide={!effectiveShowAdvanced}
                orientation="right"
                domain={["auto", "auto"]}
                tickFormatter={config.advancedAxisFormatter}
                tick={{
                  fill: "var(--chart-secondary)",
                  fontSize: 11,
                }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              {kind === "goalie" && effectiveShowAdvanced ? (
                <ReferenceLine
                  yAxisId="advanced"
                  y={0}
                  stroke="var(--chart-reference)"
                  strokeDasharray="5 5"
                />
              ) : null}
              <Tooltip
                content={
                  <PlayerPerformanceTooltip
                    kind={kind}
                    showPrimary={effectiveShowPrimary}
                    showAdvanced={effectiveShowAdvanced}
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
              {effectiveShowPrimary ? (
                <Line
                  yAxisId="primary"
                  type="monotone"
                  dataKey={config.primaryDataKey}
                  name={config.primaryLabel}
                  stroke="var(--chart-primary)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ) : null}
              {effectiveShowAdvanced ? (
                <Line
                  yAxisId="advanced"
                  type="monotone"
                  dataKey={config.advancedDataKey}
                  name={config.advancedLabel}
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
          No {venue} appearances are stored for this season phase.
        </div>
      )}

      {data.length > 0 && !hasAdvancedData ? (
        <p className="workspace-chart-coverage">
          {config.advancedLabel} is not available for this season phase, so
          only {config.primaryLabel} is shown.
        </p>
      ) : null}

      <PlayerPerformanceTable
        data={data}
        kind={kind}
        playerName={playerName}
        venue={venue}
        windowSize={windowSize}
        showPrimary={effectiveShowPrimary}
        showAdvanced={effectiveShowAdvanced}
      />
    </div>
  );
}

type PlayerPerformanceTooltipProps = Partial<TooltipContentProps> & {
  kind: "skater" | "goalie";
  showPrimary: boolean;
  showAdvanced: boolean;
};

function PlayerPerformanceTooltip({
  active,
  payload = [],
  kind,
  showPrimary,
  showAdvanced,
}: PlayerPerformanceTooltipProps) {
  const point = payload[0]?.payload as
    | PlayerPerformanceChartPoint
    | undefined;
  if (!active || !point) {
    return null;
  }

  const config = chartConfig(kind);
  return (
    <div className="workspace-chart-tooltip">
      <p className="workspace-chart-tooltip-date">
        {formatFullDate(point.gameDate)}
      </p>
      <p className="workspace-chart-tooltip-game">
        {point.teamAbbreviation} {point.scoreLabel} · {point.venueLabel}{" "}
        {point.opponentAbbreviation}
      </p>
      <dl>
        {showPrimary ? (
          <div>
            <dt>{config.primaryLabel}</dt>
            <dd>{config.primaryValueFormatter(point.primaryValue)}</dd>
          </div>
        ) : null}
        {showAdvanced ? (
          <div>
            <dt>{config.advancedLabel}</dt>
            <dd>{config.advancedValueFormatter(point.advancedValue)}</dd>
          </div>
        ) : null}
      </dl>
      <p className="workspace-chart-tooltip-sample">
        {point.sampleSize}-game official sample ·{" "}
        {point.advancedSampleSize}-game advanced sample
      </p>
    </div>
  );
}

function PlayerPerformanceTable({
  data,
  kind,
  playerName,
  venue,
  windowSize,
  showPrimary,
  showAdvanced,
}: {
  data: PlayerPerformanceChartPoint[];
  kind: "skater" | "goalie";
  playerName: string;
  venue: PerformanceVenue;
  windowSize: RollingWindow;
  showPrimary: boolean;
  showAdvanced: boolean;
}) {
  const config = chartConfig(kind);

  return (
    <table className="sr-only">
      <caption>
        {playerName} rolling {venue === "all" ? "" : `${venue} `}
        {kind} performance using up to {windowSize} games per point
      </caption>
      <thead>
        <tr>
          <th>Date</th>
          <th>Team</th>
          <th>Opponent</th>
          <th>Score</th>
          {showPrimary ? <th>{config.primaryLabel}</th> : null}
          {showAdvanced ? <th>{config.advancedLabel}</th> : null}
        </tr>
      </thead>
      <tbody>
        {data.map((point) => (
          <tr key={point.nhlGameId}>
            <td>{formatFullDate(point.gameDate)}</td>
            <td>{point.teamAbbreviation}</td>
            <td>
              {point.venueLabel} {point.opponentName}
            </td>
            <td>{point.scoreLabel}</td>
            {showPrimary ? (
              <td>{config.primaryValueFormatter(point.primaryValue)}</td>
            ) : null}
            {showAdvanced ? (
              <td>{config.advancedValueFormatter(point.advancedValue)}</td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function chartConfig(kind: "skater" | "goalie") {
  return kind === "skater"
    ? {
        title: "Rolling Skater Production",
        description:
          "Points per game alongside individual expected goals per game.",
        primaryDataKey: "primaryValue",
        primaryLabel: "Points/Game",
        primaryShortLabel: "PTS/GP",
        primaryAxisFormatter: (value: number) => value.toFixed(1),
        primaryValueFormatter: formatRate,
        advancedDataKey: "advancedValue",
        advancedLabel: "Individual xG/Game",
        advancedShortLabel: "ixG/GP",
        advancedAxisFormatter: (value: number) => value.toFixed(2),
        advancedValueFormatter: formatRate,
      }
    : {
        title: "Rolling Goalie Performance",
        description:
          "Save percentage alongside goals saved above expected per game.",
        primaryDataKey: "primaryValue",
        primaryLabel: "Save Percentage",
        primaryShortLabel: "SV%",
        primaryAxisFormatter: (value: number) => `${value.toFixed(0)}%`,
        primaryValueFormatter: formatPercentage,
        advancedDataKey: "advancedValue",
        advancedLabel: "GSAx/Game",
        advancedShortLabel: "GSAx/GP",
        advancedAxisFormatter: (value: number) => value.toFixed(1),
        advancedValueFormatter: formatSignedRate,
      };
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

function formatRate(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}

function formatPercentage(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

function formatSignedRate(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}
