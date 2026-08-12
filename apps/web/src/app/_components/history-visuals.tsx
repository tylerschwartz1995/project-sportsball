"use client";

import { useState, type ReactNode } from "react";
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

const RECORD_METRICS = [
  { value: "points", label: "Points" },
  { value: "goals", label: "Goals" },
  { value: "assists", label: "Assists" },
] as const;

const LEAGUE_METRICS = [
  {
    value: "goalsPerTeamGame",
    label: "Goals / Team Game",
    title: "Goals Per Team Game",
    decimals: 2,
    axisDecimals: 1,
    padding: 0.25,
  },
  {
    value: "pointsPerTeamGame",
    label: "Points / Team Game",
    title: "Points Per Team Game",
    decimals: 2,
    axisDecimals: 1,
    padding: 0.12,
  },
  {
    value: "winsPerTeamGame",
    label: "Wins / Team Game",
    title: "Wins Per Team Game",
    decimals: 3,
    axisDecimals: 2,
    padding: 0.04,
  },
] as const;

type RecordMetric = (typeof RECORD_METRICS)[number]["value"];
type LeagueMetric = (typeof LEAGUE_METRICS)[number]["value"];

export function HistoryRecordProgression({
  points,
}: {
  points: HistoryRecordProgressionPoint[];
}) {
  const [metric, setMetric] = useState<RecordMetric>("points");
  const metricLabel = RECORD_METRICS.find((item) => item.value === metric)?.label ?? "Points";
  const selectedPoints = points.filter((point) => point.metric === metric);
  if (selectedPoints.length === 0) return null;

  const data = selectedPoints.map((point) => ({
    season: seasonStart(point.seasonId),
    seasonLabel: formatSeason(point.seasonId),
    holder: point.name,
    value: point.value,
  }));

  return (
    <HistoryChartShell
      title={`Career ${metricLabel} Record Progression`}
      description={`Tracks seasons in which the NHL career-${metricLabel.toLowerCase()} record moved higher. Hover or focus the chart to see the record holder.`}
      control={<MetricSelect label="Record metric" value={metric} options={RECORD_METRICS} onChange={(value) => setMetric(value as RecordMetric)} />}
    >
      <div className="workspace-history-chart-plot">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 14, right: 20, bottom: 8, left: 4 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="season"
            type="number"
            domain={["dataMin", "dataMax"]}
            ticks={decadeTicks(data)}
            interval={0}
            tick={{ fill: "var(--muted)", fontSize: "0.68rem" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            width={48}
            tickFormatter={(value) => Number(value).toLocaleString("en-CA")}
            tick={{ fill: "var(--muted)", fontSize: "0.78rem" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<RecordTooltip metricLabel={metricLabel} />} />
          <Line
            type="monotoneX"
            dataKey="value"
            name={`Career ${metricLabel.toLowerCase()} record`}
            stroke="var(--accent)"
            strokeWidth={2.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{ r: 4, fill: "var(--accent)" }}
          />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <AccessibleRecordTable points={selectedPoints} metricLabel={metricLabel} />
    </HistoryChartShell>
  );
}

export function HistoryScoringEnvironment({
  points,
}: {
  points: HistoryLeagueTrendPoint[];
}) {
  const [metric, setMetric] = useState<LeagueMetric>("goalsPerTeamGame");
  const config = LEAGUE_METRICS.find((item) => item.value === metric) ?? LEAGUE_METRICS[0];
  if (points.length === 0) return null;

  const data = points.map((point) => ({
    season: seasonStart(point.seasonId),
    seasonLabel: formatSeason(point.seasonId),
    value: Number(point[metric].toFixed(config.decimals)),
  }));

  return (
    <HistoryChartShell
      title={config.title}
      description="League scoring and results have changed across eras. Use this context when comparing raw totals and rates from different periods."
      control={<MetricSelect label="League metric" value={metric} options={LEAGUE_METRICS} onChange={(value) => setMetric(value as LeagueMetric)} />}
    >
      <div className="workspace-history-chart-plot">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 14, right: 20, bottom: 8, left: 4 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="season"
            type="number"
            domain={["dataMin", "dataMax"]}
            ticks={decadeTicks(data)}
            interval={0}
            tick={{ fill: "var(--muted)", fontSize: "0.68rem" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            domain={[
              (minimum: number) => Math.max(0, minimum - config.padding),
              (maximum: number) => maximum + config.padding,
            ]}
            width={42}
            tickFormatter={(value) => Number(value).toFixed(config.axisDecimals)}
            tick={{ fill: "var(--muted)", fontSize: "0.78rem" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<LeagueTooltip metricLabel={config.label} decimals={config.decimals} />} />
          <Line
            type="monotoneX"
            dataKey="value"
            name={config.label}
            stroke="var(--accent-secondary)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{ r: 4, fill: "var(--accent-secondary)" }}
          />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <AccessibleLeagueTable points={data} label={config.label} decimals={config.decimals} />
    </HistoryChartShell>
  );
}

function HistoryChartShell({
  title,
  description,
  control,
  children,
}: {
  title: string;
  description: string;
  control: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="workspace-history-chart">
      <header>
        <div className="workspace-history-chart-heading">
          <div className="workspace-history-chart-heading-copy">
            <h3>{title}</h3>
            <span>{description}</span>
          </div>
          {control}
        </div>
      </header>
      <div className="workspace-history-chart-canvas">{children}</div>
    </section>
  );
}

function MetricSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="workspace-history-chart-metric">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function RecordTooltip({ active, payload, metricLabel }: TooltipProps & { metricLabel: string }) {
  const row = active ? payload?.[0]?.payload as RecordChartRow | undefined : undefined;
  if (!row) return null;
  return (
    <div className="workspace-history-tooltip">
      <span>{row.seasonLabel}</span>
      <strong>{row.holder}</strong>
      <b>{row.value.toLocaleString("en-CA")} career {metricLabel.toLowerCase()}</b>
    </div>
  );
}

function LeagueTooltip({ active, payload, metricLabel, decimals }: TooltipProps & { metricLabel: string; decimals: number }) {
  const row = active ? payload?.[0]?.payload as LeagueChartRow | undefined : undefined;
  if (!row) return null;
  return (
    <div className="workspace-history-tooltip">
      <span>{row.seasonLabel}</span>
      <strong>{row.value.toFixed(decimals)} {metricLabel.toLowerCase()}</strong>
    </div>
  );
}

function AccessibleRecordTable({
  points,
  metricLabel,
}: {
  points: HistoryRecordProgressionPoint[];
  metricLabel: string;
}) {
  return (
    <div className="workspace-history-a11y-table">
      <table>
        <caption>Career {metricLabel.toLowerCase()} record progression by season</caption>
        <thead><tr><th>Season</th><th>Record holder</th><th>Career {metricLabel.toLowerCase()} record</th></tr></thead>
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

function AccessibleLeagueTable({
  points,
  label,
  decimals,
}: {
  points: LeagueChartRow[];
  label: string;
  decimals: number;
}) {
  return (
    <div className="workspace-history-a11y-table">
      <table>
        <caption>League {label.toLowerCase()} by season</caption>
        <thead><tr><th>Season</th><th>{label}</th></tr></thead>
        <tbody>{points.map((point) => (
          <tr key={point.season}>
            <td>{point.seasonLabel}</td>
            <td>{point.value.toFixed(decimals)}</td>
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
  season: number;
  seasonLabel: string;
  holder: string;
  value: number;
};

type LeagueChartRow = {
  season: number;
  seasonLabel: string;
  value: number;
};

function decadeTicks(points: Array<{ season: number }>): number[] {
  const first = Math.ceil(Math.min(...points.map((point) => point.season)) / 10) * 10;
  const last = Math.floor(Math.max(...points.map((point) => point.season)) / 10) * 10;
  const ticks: number[] = [];
  for (let year = first; year <= last; year += 10) ticks.push(year);
  return ticks;
}

function seasonStart(seasonId: number): number {
  return Math.floor(seasonId / 10_000);
}

function formatSeason(seasonId: number): string {
  return `${seasonStart(seasonId)}–${String(seasonId % 10_000).slice(-2)}`;
}
