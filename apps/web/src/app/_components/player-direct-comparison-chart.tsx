"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  PlayerComparisonEntry,
  PlayerComparisonMetric,
} from "@/contracts/player-comparison-view";
import { formatComparisonValue } from "@/lib/player-comparison";

export function PlayerDirectComparisonChart({
  players,
  metrics,
}: {
  players: PlayerComparisonEntry[];
  metrics: PlayerComparisonMetric[];
}) {
  const [metricKey, setMetricKey] = useState(metrics[0]?.key ?? "");
  const metric =
    metrics.find((candidate) => candidate.key === metricKey) ?? metrics[0];
  if (!metric || players.length < 2) return null;

  const data = players.map((player) => ({
    name: shortName(player.name),
    fullName: player.name,
    value: player.values[metric.key],
  }));
  const hasData = data.some((row) => row.value !== null);

  return (
    <section className="workspace-chart-panel">
      <header className="workspace-player-chart-header">
        <div>
          <p>Head to Head</p>
          <h3>{metric.label}</h3>
        </div>
        <p>
          Switch metrics to compare the selected players on one consistent
          scale.
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
                disabled={players.every(
                  (player) => player.values[option.key] === null,
                )}
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {hasData ? (
        <div
          className="workspace-chart workspace-player-direct-chart"
          role="img"
          aria-label={`${metric.label} comparison for ${players.map((player) => player.name).join(", ")}.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 16, right: 18, bottom: 18, left: 8 }}
              accessibilityLayer
            >
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--chart-label)", fontSize: 13 }}
                tickLine={false}
                axisLine={{ stroke: "var(--chart-axis)" }}
              />
              <YAxis
                tickFormatter={(value) =>
                  formatComparisonValue(value, metric)
                }
                tick={{ fill: "var(--chart-label)", fontSize: 13 }}
                tickLine={false}
                axisLine={false}
                width={62}
              />
              <Tooltip
                formatter={(value) => [
                  formatComparisonValue(Number(value), metric),
                  metric.shortLabel,
                ]}
                labelFormatter={(_, payload) =>
                  payload[0]?.payload.fullName ?? ""
                }
                contentStyle={{
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: 12,
                  fontSize: 14,
                }}
              />
              <Bar
                dataKey="value"
                name={metric.label}
                fill="var(--chart-primary)"
                radius={[7, 7, 0, 0]}
                maxBarSize={110}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="workspace-chart-empty">
          This metric is unavailable for the selected players.
        </div>
      )}
    </section>
  );
}

function shortName(name: string): string {
  const parts = name.split(" ");
  return parts.length <= 1
    ? name
    : `${parts[0].charAt(0)}. ${parts[parts.length - 1]}`;
}
