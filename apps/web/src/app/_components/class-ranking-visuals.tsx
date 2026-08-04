import Link from "next/link";

import type { DraftClassPerformance } from "@/contracts/draft";

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
    </div>
  );
}

function DraftOutcomeMix({ rows }: { rows: DraftClassPerformance[] }) {
  const decades = groupByDecade(rows);

  return (
    <section className="workspace-chart-panel">
      <header className="workspace-player-chart-header">
        <div>
          <p>Career Outcome Distribution</p>
          <h3>Where Each Draft Class&apos;s Picks Landed</h3>
        </div>
        <p>
          Every bar represents 100% of a class&apos;s current career outcomes.
          Older classes have had more time to reach the higher milestones.
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
      <div className="workspace-class-outcome-scale" aria-hidden="true">
        <span>Draft</span>
        <div>
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
        <span>100+ Rate</span>
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
                    label: "No NHL appearance",
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
                      tabIndex={0}
                      aria-describedby={`class-outcome-${draftClass.draftYear}`}
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
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <span className="workspace-class-outcome-established">
                      <strong>{formatPercentage(draftClass.hundredGameRate)}</strong>
                    </span>
                    <div
                      id={`class-outcome-${draftClass.draftYear}`}
                      className="workspace-class-outcome-tooltip"
                      role="tooltip"
                    >
                      <strong>
                        {draftClass.draftYear} Draft · {draftClass.selections} picks
                      </strong>
                      <div>
                        {categories.map((category) => (
                          <span key={category.id}>
                            <i className={category.className} aria-hidden="true" />
                            <span>{category.label}</span>
                            <b>
                              {category.count} · {formatPercentage(
                                category.count / draftClass.selections,
                              )}
                            </b>
                          </span>
                        ))}
                      </div>
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

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
