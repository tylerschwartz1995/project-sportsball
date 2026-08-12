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
      <div>
        {leaders.map((row) => (
          <Link href={`/players/${row.nhlPlayerId}`} key={row.decade}>
            <span>{row.decade}s</span>
            <strong>{row.name}</strong>
            <small>
              {row.value.toLocaleString("en-CA")} {selectedMetric.abbreviation}
              {" · "}
              {row.gamesPlayed.toLocaleString("en-CA")} GP
            </small>
          </Link>
        ))}
      </div>
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
      <div>
        {leaders.map((row) => (
          <Link href={`/players/${row.nhlPlayerId}`} key={row.decade}>
            <span>{row.decade}s</span>
            <strong>{row.name}</strong>
            <small>
              {formatGoalieValue(row.value, metric, selectedMetric.decimals)} {selectedMetric.abbreviation}
              {" · "}
              {row.gamesPlayed.toLocaleString("en-CA")} GP
            </small>
          </Link>
        ))}
      </div>
    </section>
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
