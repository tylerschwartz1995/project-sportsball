"use client";

import Link from "next/link";
import { useState } from "react";

import type {
  HistoricalDecadeLeader,
  HistoricalDecadeMetric,
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
