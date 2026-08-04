"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  HistoryLeagueTrendPoint,
  HistoryRecordProgressionPoint,
} from "@/contracts/history";

export function HistoryRecordProgression({
  points,
}: {
  points: HistoryRecordProgressionPoint[];
}) {
  if (points.length === 0) return null;

  const data = points.map((point) => ({
    season: seasonStart(point.seasonId),
    seasonLabel: formatSeason(point.seasonId),
    holder: point.name,
    points: point.value,
  }));

  return (
    <HistoryChartShell
      title="Career Points Record Progression"
      description="Each step marks a season in which the NHL career-points record moved higher. Hover or focus the chart to see the record holder."
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 14, right: 20, bottom: 8, left: 4 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="season"
            minTickGap={42}
            tick={{ fill: "var(--muted)", fontSize: "0.78rem" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            width={48}
            tick={{ fill: "var(--muted)", fontSize: "0.78rem" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<RecordTooltip />} />
          <Line
            type="stepAfter"
            dataKey="points"
            name="Career points record"
            stroke="var(--accent)"
            strokeWidth={2.75}
            dot={false}
            activeDot={{ r: 4, fill: "var(--accent)" }}
          />
        </LineChart>
      </ResponsiveContainer>
      <AccessibleRecordTable points={points} />
    </HistoryChartShell>
  );
}

export function HistoryScoringEnvironment({
  points,
}: {
  points: HistoryLeagueTrendPoint[];
}) {
  if (points.length === 0) return null;

  const data = points.map((point) => ({
    season: seasonStart(point.seasonId),
    seasonLabel: formatSeason(point.seasonId),
    goals: Number(point.goalsPerTeamGame.toFixed(2)),
  }));

  return (
    <HistoryChartShell
      title="Goals Per Team Game"
      description="League scoring has changed dramatically. This context explains why raw totals and rates from different eras should not be treated as equivalent."
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 14, right: 20, bottom: 8, left: 4 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="season"
            minTickGap={42}
            tick={{ fill: "var(--muted)", fontSize: "0.78rem" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            domain={["dataMin - 0.25", "dataMax + 0.25"]}
            width={42}
            tickFormatter={(value) => Number(value).toFixed(1)}
            tick={{ fill: "var(--muted)", fontSize: "0.78rem" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ScoringTooltip />} />
          <Line
            type="monotone"
            dataKey="goals"
            name="Goals per team game"
            stroke="var(--accent-secondary)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: "var(--accent-secondary)" }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="workspace-history-a11y-table">
        <table>
          <caption>League goals per team game by season</caption>
          <thead><tr><th>Season</th><th>Goals per team game</th></tr></thead>
          <tbody>{points.map((point) => (
            <tr key={point.seasonId}>
              <td>{formatSeason(point.seasonId)}</td>
              <td>{point.goalsPerTeamGame.toFixed(2)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </HistoryChartShell>
  );
}

function HistoryChartShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="workspace-history-chart">
      <header>
        <h3>{title}</h3>
        <span>{description}</span>
      </header>
      <div className="workspace-history-chart-canvas">{children}</div>
    </section>
  );
}

function RecordTooltip({ active, payload }: TooltipProps) {
  const row = active ? payload?.[0]?.payload as RecordChartRow | undefined : undefined;
  if (!row) return null;
  return (
    <div className="workspace-history-tooltip">
      <span>{row.seasonLabel}</span>
      <strong>{row.holder}</strong>
      <b>{row.points.toLocaleString("en-CA")} career points</b>
    </div>
  );
}

function ScoringTooltip({ active, payload }: TooltipProps) {
  const row = active ? payload?.[0]?.payload as ScoringChartRow | undefined : undefined;
  if (!row) return null;
  return (
    <div className="workspace-history-tooltip">
      <span>{row.seasonLabel}</span>
      <strong>{row.goals.toFixed(2)} goals per team game</strong>
    </div>
  );
}

function AccessibleRecordTable({
  points,
}: {
  points: HistoryRecordProgressionPoint[];
}) {
  return (
    <div className="workspace-history-a11y-table">
      <table>
        <caption>Career points record progression by season</caption>
        <thead><tr><th>Season</th><th>Record holder</th><th>Career points record</th></tr></thead>
        <tbody>{points.map((point) => (
          <tr key={`${point.seasonId}-${point.nhlPlayerId}`}>
            <td>{formatSeason(point.seasonId)}</td>
            <td>{point.name}</td>
            <td>{point.value}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: unknown }>;
};

type RecordChartRow = {
  seasonLabel: string;
  holder: string;
  points: number;
};

type ScoringChartRow = {
  seasonLabel: string;
  goals: number;
};

function seasonStart(seasonId: number): number {
  return Math.floor(seasonId / 10_000);
}

function formatSeason(seasonId: number): string {
  return `${seasonStart(seasonId)}–${String(seasonId % 10_000).slice(-2)}`;
}
