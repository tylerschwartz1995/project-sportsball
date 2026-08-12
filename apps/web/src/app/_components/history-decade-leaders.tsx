"use client";

import Link from "next/link";
import { useState } from "react";

import type {
  HistoricalDecadeLeader,
  HistoricalDecadeMetric,
  HistoricalGoalieDecadeLeader,
  HistoricalGoalieDecadeMetric,
} from "@/contracts/history";

const DECADE_METRICS: ReadonlyArray<{
  value: HistoricalDecadeMetric;
  label: string;
  abbreviation: string;
}> = [
  { value: "points", label: "Points", abbreviation: "PTS" },
  { value: "goals", label: "Goals", abbreviation: "G" },
  { value: "assists", label: "Assists", abbreviation: "A" },
];

const GOALIE_DECADE_METRICS: ReadonlyArray<{
  value: HistoricalGoalieDecadeMetric;
  label: string;
  heading: string;
  abbreviation: string;
  decimals: number;
}> = [
  { value: "wins", label: "Wins", heading: "Wins", abbreviation: "W", decimals: 0 },
  { value: "savePercentage", label: "Save Percentage", heading: "Save Percentage", abbreviation: "SV%", decimals: 3 },
  { value: "goalsAgainstAverage", label: "Goals-Against Average", heading: "GAA", abbreviation: "GAA", decimals: 2 },
];

type DecadeTableRow = {
  decade: number;
  nhlPlayerId: number;
  name: string;
  value: number;
  gamesPlayed: number;
};

export function HistoryDecadeLeaders({
  rows,
}: {
  rows: HistoricalDecadeLeader[];
}) {
  const [metric, setMetric] = useState<HistoricalDecadeMetric>("points");
  const selectedMetric = DECADE_METRICS.find(
    (option) => option.value === metric,
  ) ?? DECADE_METRICS[0];
  const leaders = rows.filter((row) => row.metric === metric);

  return (
    <section className="workspace-history-decades">
      <header>
        <h2>Decade {selectedMetric.label} Leaders</h2>
        <label className="workspace-history-chart-metric">
          <span>Leader metric</span>
          <select
            value={metric}
            onChange={(event) =>
              setMetric(event.target.value as HistoricalDecadeMetric)
            }
          >
            {DECADE_METRICS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>
      <DecadeLeadersTable
        rows={leaders}
        metricLabel={selectedMetric.abbreviation}
        formatValue={(value) => value.toLocaleString("en-CA")}
      />
    </section>
  );
}

export function HistoryGoalieDecadeLeaders({
  rows,
  minimumGames,
}: {
  rows: HistoricalGoalieDecadeLeader[];
  minimumGames: number;
}) {
  const [metric, setMetric] = useState<HistoricalGoalieDecadeMetric>("wins");
  const selectedMetric = GOALIE_DECADE_METRICS.find(
    (option) => option.value === metric,
  ) ?? GOALIE_DECADE_METRICS[0];
  const leaders = rows.filter((row) => row.metric === metric);

  return (
    <section className="workspace-history-decades">
      <header>
        <div>
          <h2>Decade {selectedMetric.heading} Leaders</h2>
          <p>Minimum {minimumGames.toLocaleString("en-CA")} games played within the decade.</p>
        </div>
        <label className="workspace-history-chart-metric">
          <span>Leader metric</span>
          <select
            value={metric}
            onChange={(event) =>
              setMetric(event.target.value as HistoricalGoalieDecadeMetric)
            }
          >
            {GOALIE_DECADE_METRICS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>
      <DecadeLeadersTable
        rows={leaders}
        metricLabel={selectedMetric.abbreviation}
        formatValue={(value) =>
          formatGoalieValue(value, metric, selectedMetric.decimals)
        }
      />
    </section>
  );
}

function DecadeLeadersTable({
  rows,
  metricLabel,
  formatValue,
}: {
  rows: DecadeTableRow[];
  metricLabel: string;
  formatValue: (value: number) => string;
}) {
  return (
    <div className="workspace-history-decades-table-scroll">
      <table className="workspace-history-decades-table">
        <thead>
          <tr>
            <th scope="col">Decade</th>
            <th scope="col">Leader</th>
            <th scope="col">{metricLabel}</th>
            <th scope="col">GP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.decade}>
              <th scope="row">{row.decade}s</th>
              <td>
                <Link href={`/players/${row.nhlPlayerId}`}>{row.name}</Link>
              </td>
              <td className="is-active-metric" data-label={metricLabel}>
                {formatValue(row.value)}
              </td>
              <td>{row.gamesPlayed.toLocaleString("en-CA")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatGoalieValue(
  value: number,
  metric: HistoricalGoalieDecadeMetric,
  decimals: number,
): string {
  if (metric === "wins") return value.toLocaleString("en-CA");
  const formatted = value.toFixed(decimals);
  return metric === "savePercentage" ? formatted.replace(/^0/, "") : formatted;
}
