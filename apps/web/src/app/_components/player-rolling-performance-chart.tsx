"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
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

type MetricConfig = {
  key: string;
  label: string;
  shortLabel: string;
  advanced: boolean;
  percentage?: boolean;
  signed?: boolean;
  referenceValue?: number;
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
  metricSampleSize: number;
  value: number | null;
};

const SKATER_METRICS: MetricConfig[] = [
  {
    key: "pointsPerGame",
    label: "Points per Game",
    shortLabel: "PTS/GP",
    advanced: false,
  },
  {
    key: "goalsPerGame",
    label: "Goals per Game",
    shortLabel: "G/GP",
    advanced: false,
  },
  {
    key: "assistsPerGame",
    label: "Assists per Game",
    shortLabel: "A/GP",
    advanced: false,
  },
  {
    key: "shotsPerGame",
    label: "Shots per Game",
    shortLabel: "S/GP",
    advanced: false,
  },
  {
    key: "individualExpectedGoalsPerGame",
    label: "Individual Expected Goals per Game",
    shortLabel: "ixG/GP",
    advanced: true,
  },
  {
    key: "gameScorePerGame",
    label: "Game Score per Game",
    shortLabel: "Game Score/GP",
    advanced: true,
  },
  {
    key: "onIceExpectedGoalsPercentage",
    label: "On-Ice Expected-Goal Share",
    shortLabel: "On-Ice xG%",
    advanced: true,
    percentage: true,
    referenceValue: 50,
  },
];

const GOALIE_METRICS: MetricConfig[] = [
  {
    key: "savePercentage",
    label: "Save Percentage",
    shortLabel: "SV%",
    advanced: false,
    percentage: true,
  },
  {
    key: "savesPerGame",
    label: "Saves per Game",
    shortLabel: "SV/GP",
    advanced: false,
  },
  {
    key: "goalsAgainstPerGame",
    label: "Goals Against per Game",
    shortLabel: "GA/GP",
    advanced: false,
  },
  {
    key: "expectedGoalsAgainstPerGame",
    label: "Expected Goals Against per Game",
    shortLabel: "xGA/GP",
    advanced: true,
  },
  {
    key: "goalsSavedAboveExpectedPerGame",
    label: "Goals Saved Above Expected per Game",
    shortLabel: "GSAx/GP",
    advanced: true,
    signed: true,
    referenceValue: 0,
  },
];

export function PlayerRollingPerformanceChart(
  props: PlayerRollingPerformanceChartProps,
) {
  const { kind, games, playerName } = props;
  const metrics = kind === "skater" ? SKATER_METRICS : GOALIE_METRICS;
  const [windowSize, setWindowSize] = useState<RollingWindow>(10);
  const [venue, setVenue] = useState<PerformanceVenue>("all");
  const [metricKey, setMetricKey] = useState(metrics[0].key);
  const metric =
    metrics.find((candidate) => candidate.key === metricKey) ?? metrics[0];
  const data = useMemo<PlayerPerformanceChartPoint[]>(() => {
    const rolling =
      kind === "skater"
        ? buildRollingSkaterPerformance(
            filterGamesByVenue(games, venue),
            windowSize,
          )
        : buildRollingGoaliePerformance(
            filterGamesByVenue(games, venue),
            windowSize,
          );

    return rolling.map((point) => {
      const values = point as unknown as Record<string, unknown>;
      const advancedSampleSizes = values.advancedSampleSizes as
        | Record<string, number>
        | undefined;
      return {
        nhlGameId: point.nhlGameId,
        gameDate: point.gameDate,
        teamAbbreviation: point.teamAbbreviation,
        opponentAbbreviation: point.opponentAbbreviation,
        opponentName: point.opponentName,
        venueLabel: point.venueLabel,
        scoreLabel: point.scoreLabel,
        sampleSize: point.sampleSize,
        metricSampleSize: metric.advanced
          ? advancedSampleSizes?.[metric.key] ?? 0
          : point.sampleSize,
        value:
          typeof values[metric.key] === "number"
            ? (values[metric.key] as number)
            : null,
      };
    });
  }, [games, kind, metric.advanced, metric.key, venue, windowSize]);
  const hasMetricData = data.some((point) => point.value !== null);

  if (games.length === 0) {
    return null;
  }

  return (
    <div className="workspace-chart-panel">
      <header className="workspace-player-chart-header">
        <div>
          <p>{kind === "skater" ? "Skater trend" : "Goalie trend"}</p>
          <h4>Rolling {metric.label}</h4>
        </div>
        <p>
          One metric at a time keeps the trend readable. Choose from official
          and advanced measures below.
        </p>
      </header>

      <div className="workspace-chart-toolbar">
        <label className="workspace-chart-metric-select">
          Metric
          <select
            value={metric.key}
            onChange={(event) => setMetricKey(event.target.value)}
          >
            {metrics.map((option) => (
              <option
                key={option.key}
                value={option.key}
                disabled={
                  option.advanced &&
                  !rollingMetricAvailable(games, kind, option.key)
                }
              >
                {option.label}
                {option.advanced ? " · Advanced" : ""}
              </option>
            ))}
          </select>
        </label>
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
        </div>
      </div>

      {data.length > 0 && hasMetricData ? (
        <div
          className="workspace-chart"
          role="img"
          aria-label={`${playerName} rolling ${metric.label.toLowerCase()} over ${windowSize} ${
            venue === "all" ? "all games" : `${venue} games`
          }.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 14, right: 12, bottom: 4, left: 0 }}
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
                tick={{ fill: "var(--chart-label)", fontSize: 15 }}
                tickLine={false}
                axisLine={{ stroke: "var(--chart-axis)" }}
                interval="preserveStartEnd"
                minTickGap={38}
              />
              <YAxis
                domain={["auto", "auto"]}
                tickFormatter={(value) => formatAxisValue(value, metric)}
                tick={{
                  fill: metric.advanced
                    ? "var(--chart-secondary)"
                    : "var(--chart-primary)",
                  fontSize: 15,
                }}
                tickLine={false}
                axisLine={false}
                width={64}
              />
              {metric.referenceValue !== undefined ? (
                <ReferenceLine
                  y={metric.referenceValue}
                  stroke="var(--chart-reference)"
                  strokeDasharray="5 5"
                />
              ) : null}
              <Tooltip
                content={
                  <PlayerPerformanceTooltip
                    metric={metric}
                  />
                }
                cursor={{
                  stroke: "var(--chart-reference)",
                  strokeWidth: 1,
                }}
                isAnimationActive="auto"
              />
              <Line
                type="monotone"
                dataKey="value"
                name={metric.label}
                stroke={
                  metric.advanced
                    ? "var(--chart-secondary)"
                    : "var(--chart-primary)"
                }
                strokeWidth={2.75}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2 }}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="workspace-chart-empty">
          No {metric.label.toLowerCase()} data is stored for these {venue}{" "}
          appearances.
        </div>
      )}

      <PlayerPerformanceTable
        data={data}
        metric={metric}
        playerName={playerName}
        venue={venue}
        windowSize={windowSize}
      />
    </div>
  );
}

function PlayerPerformanceTooltip({
  active,
  payload = [],
  metric,
}: Partial<TooltipContentProps> & {
  metric: MetricConfig;
}) {
  const point = payload[0]?.payload as
    | PlayerPerformanceChartPoint
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
        <TeamLogo abbreviation={point.teamAbbreviation} size="tiny" decorative />
        <span>{point.teamAbbreviation} {point.scoreLabel} · {point.venueLabel}</span>
        <TeamLogo
          abbreviation={point.opponentAbbreviation}
          size="tiny"
          decorative
        />
        <span>{point.opponentAbbreviation}</span>
      </p>
      <dl>
        <div>
          <dt>{metric.label}</dt>
          <dd>{formatMetricValue(point.value, metric)}</dd>
        </div>
      </dl>
      <p className="workspace-chart-tooltip-sample">
        {point.metricSampleSize}-game metric sample
      </p>
    </div>
  );
}

function PlayerPerformanceTable({
  data,
  metric,
  playerName,
  venue,
  windowSize,
}: {
  data: PlayerPerformanceChartPoint[];
  metric: MetricConfig;
  playerName: string;
  venue: PerformanceVenue;
  windowSize: RollingWindow;
}) {
  return (
    <div className="sr-only">
      <table>
      <caption>
        {playerName} rolling {venue === "all" ? "" : `${venue} `}
        {metric.label.toLowerCase()} using up to {windowSize} games per point
      </caption>
      <thead>
        <tr>
          <th>Date</th>
          <th>Team</th>
          <th>Opponent</th>
          <th>Score</th>
          <th>{metric.label}</th>
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
            <td>{formatMetricValue(point.value, metric)}</td>
          </tr>
        ))}
      </tbody>
      </table>
    </div>
  );
}

function rollingMetricAvailable(
  games: SkaterPerformanceGame[] | GoaliePerformanceGame[],
  kind: "skater" | "goalie",
  key: string,
) {
  if (kind === "skater") {
    const skaterGames = games as SkaterPerformanceGame[];
    if (key === "individualExpectedGoalsPerGame") {
      return skaterGames.some((game) => game.individualXGoals !== null);
    }
    if (key === "gameScorePerGame") {
      return skaterGames.some((game) => game.gameScore !== null);
    }
    if (key === "onIceExpectedGoalsPercentage") {
      return skaterGames.some(
        (game) => game.onIceXGoalsPercentage !== null,
      );
    }
    return true;
  }

  const goalieGames = games as GoaliePerformanceGame[];
  if (key === "expectedGoalsAgainstPerGame") {
    return goalieGames.some((game) => game.expectedGoalsAgainst !== null);
  }
  if (key === "goalsSavedAboveExpectedPerGame") {
    return goalieGames.some(
      (game) => game.goalsSavedAboveExpected !== null,
    );
  }
  return true;
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

function formatAxisValue(value: number, metric: MetricConfig): string {
  if (metric.percentage) {
    return `${value.toFixed(0)}%`;
  }
  return `${metric.signed && value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function formatMetricValue(
  value: number | null,
  metric: MetricConfig,
): string {
  if (value === null) {
    return "—";
  }
  const sign = metric.signed && value > 0 ? "+" : "";
  const suffix = metric.percentage ? "%" : "";
  return `${sign}${value.toFixed(2)}${suffix}`;
}
