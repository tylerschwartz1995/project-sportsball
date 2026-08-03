import Link from "next/link";
import type { CSSProperties } from "react";

import type { DraftClassPerformance } from "@/contracts/draft";

type HeatmapMetric = {
  id: string;
  label: string;
  value: (row: DraftClassPerformance) => number | null;
  format: (value: number) => string;
};

const heatmapMetrics: HeatmapMetric[] = [
  {
    id: "nhl",
    label: "NHL Appearance",
    value: (row) => row.appearanceRate,
    format: formatPercentage,
  },
  {
    id: "100-games",
    label: "100+ Games",
    value: (row) => row.hundredGameRate,
    format: formatPercentage,
  },
  {
    id: "500-games",
    label: "500+ Games",
    value: (row) => row.fiveHundredGameRate,
    format: formatPercentage,
  },
  {
    id: "games-per-pick",
    label: "Games / Pick",
    value: (row) => row.averageGames,
    format: formatWholeNumber,
  },
  {
    id: "points-per-skater",
    label: "Points / Skater",
    value: (row) => row.pointsPerSkaterPick,
    format: formatWholeNumber,
  },
  {
    id: "game-score-per-skater",
    label: "Game Score / Skater",
    value: (row) => row.gameScorePerSkaterPick,
    format: formatWholeNumber,
  },
];

export function ClassRankingVisuals({
  rows,
}: {
  rows: DraftClassPerformance[];
}) {
  const chronologicalRows = [...rows].sort(
    (left, right) => right.draftYear - left.draftYear,
  );

  return (
    <div className="workspace-class-ranking-visuals mt-7">
      <DraftOutcomeMix rows={chronologicalRows} />
      <ClassMetricHeatmap rows={chronologicalRows} />
    </div>
  );
}

function DraftOutcomeMix({ rows }: { rows: DraftClassPerformance[] }) {
  const decades = groupByDecade(rows);

  return (
    <section className="workspace-chart-panel">
      <header className="workspace-player-chart-header">
        <div>
          <p>Draft Outcome Mix</p>
          <h3>How Far Each Class&apos;s Picks Progressed</h3>
        </div>
        <p>
          Every bar represents 100% of a draft class. Longer cyan and green
          sections indicate more picks becoming established NHL players.
        </p>
      </header>
      <div
        className="workspace-chart-legend workspace-class-outcome-legend"
        aria-label="Draft outcome categories"
      >
        <LegendItem className="is-no-nhl" label="No NHL Appearance" />
        <LegendItem className="is-under-100" label="1–99 Games" />
        <LegendItem className="is-regular" label="100–499 Games" />
        <LegendItem className="is-long-career" label="500+ Games" />
      </div>
      <div className="workspace-class-outcome-decades">
        {decades.map(({ decade, classes }) => (
          <section key={decade} className="workspace-class-outcome-decade">
            <header>
              <h4>{decade}s</h4>
              <span>{classes.length} classes</span>
            </header>
            <div>
              {classes.map((draftClass) => {
                const noNhl = draftClass.selections - draftClass.playersWithNhlGames;
                const underHundred =
                  draftClass.playersWithNhlGames - draftClass.hundredGamePlayers;
                const hundredTo499 =
                  draftClass.hundredGamePlayers -
                  draftClass.fiveHundredGamePlayers;
                const fiveHundred = draftClass.fiveHundredGamePlayers;
                const categories = [
                  {
                    id: "no-nhl",
                    count: noNhl,
                    className: "is-no-nhl",
                    label: "no NHL appearance",
                  },
                  {
                    id: "under-100",
                    count: underHundred,
                    className: "is-under-100",
                    label: "1–99 games",
                  },
                  {
                    id: "regular",
                    count: hundredTo499,
                    className: "is-regular",
                    label: "100–499 games",
                  },
                  {
                    id: "long-career",
                    count: fiveHundred,
                    className: "is-long-career",
                    label: "500+ games",
                  },
                ];

                return (
                  <div key={draftClass.draftYear} className="workspace-class-outcome-row">
                    <Link href={`/drafts?view=outcomes&year=${draftClass.draftYear}`}>
                      {draftClass.draftYear}
                    </Link>
                    <div
                      className="workspace-class-outcome-bar"
                      role="img"
                      aria-label={categories
                        .map(
                          (category) =>
                            `${category.count} picks with ${category.label}`,
                        )
                        .join(", ")}
                    >
                      {categories.map((category) => (
                        <span
                          key={category.id}
                          className={category.className}
                          style={{
                            width: `${(category.count / draftClass.selections) * 100}%`,
                          }}
                          title={`${category.count} · ${formatPercentage(
                            category.count / draftClass.selections,
                          )} ${category.label}`}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function ClassMetricHeatmap({ rows }: { rows: DraftClassPerformance[] }) {
  const valuesByMetric = new Map(
    heatmapMetrics.map((metric) => [
      metric.id,
      rows
        .map(metric.value)
        .filter((value): value is number => value !== null)
        .sort((left, right) => left - right),
    ]),
  );

  return (
    <section className="workspace-chart-panel">
      <header className="workspace-player-chart-header">
        <div>
          <p>Class Metric Heatmap</p>
          <h3>Strengths and Weaknesses at a Glance</h3>
        </div>
        <p>
          More saturated cyan cells rank higher within that metric. Compare
          colors down a column; the printed value preserves the exact result.
        </p>
      </header>
      <div className="workspace-class-heatmap-scroll">
        <table className="workspace-class-heatmap">
          <thead>
            <tr>
              <th scope="col">Draft Class</th>
              {heatmapMetrics.map((metric) => (
                <th key={metric.id} scope="col">
                  {metric.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((draftClass) => (
              <tr key={draftClass.draftYear}>
                <th scope="row">
                  <Link href={`/drafts?view=outcomes&year=${draftClass.draftYear}`}>
                    {draftClass.draftYear}
                  </Link>
                </th>
                {heatmapMetrics.map((metric) => {
                  const value = metric.value(draftClass);
                  if (value === null) {
                    return (
                      <td key={metric.id} className="is-unavailable">
                        —
                      </td>
                    );
                  }
                  const rank = percentileRank(
                    valuesByMetric.get(metric.id) ?? [],
                    value,
                  );
                  const style = {
                    "--heat-percent": `${10 + rank * 38}%`,
                  } as CSSProperties;
                  return (
                    <td key={metric.id} style={style}>
                      {metric.format(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="workspace-team-drafting-chart-note">
        Heat colors are percentile ranks within each column, not a combined
        grade. Career-total metrics naturally favour older classes; unavailable
        Game Score coverage is shown as a dash.
      </p>
    </section>
  );
}

function LegendItem({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span>
      <i className={className} aria-hidden="true" />
      {label}
    </span>
  );
}

function groupByDecade(rows: DraftClassPerformance[]) {
  const decades = new Map<number, DraftClassPerformance[]>();
  for (const row of rows) {
    const decade = Math.floor(row.draftYear / 10) * 10;
    const classes = decades.get(decade);
    if (classes) {
      classes.push(row);
    } else {
      decades.set(decade, [row]);
    }
  }
  return [...decades.entries()]
    .sort(([left], [right]) => right - left)
    .map(([decade, classes]) => ({ decade, classes }));
}

function percentileRank(sortedValues: number[], value: number): number {
  if (sortedValues.length <= 1) return 1;
  const lowerCount = sortedValues.filter((candidate) => candidate < value).length;
  const equalCount = sortedValues.filter((candidate) => candidate === value).length;
  return (
    lowerCount + Math.max(0, equalCount - 1) / 2
  ) / (sortedValues.length - 1);
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatWholeNumber(value: number): string {
  return Math.round(value).toLocaleString("en-CA");
}
