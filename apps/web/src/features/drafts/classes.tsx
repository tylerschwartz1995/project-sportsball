import { TableScroll } from "@/components/ui/table-scroll";
import { ContextLink as Link } from "@/components/ui/context-link";
import { DeferredSection } from "@/components/ui/deferred-section";
import { Pagination } from "@/components/ui/pagination";
import { SortableHeader } from "@/components/ui/sortable-header";
import { SortableTable } from "@/components/ui/sortable-table";
import { WorkspacePanel } from "@/components/ui/workspace-primitives";
import type { DraftAnalytics, DraftClassPerformance } from "@/contracts/draft";
import { NumberCell } from "@/features/drafts/cells";
import { ClassRankingVisuals } from "@/features/charts/lazy-charts";
import { formatPercentage, relativeRangePosition, sortedValues } from "@/features/drafts/logic";
import { DraftsPageProps } from "@/features/drafts/route-state";
import { firstQueryValue, paginate, parsePage, parseSortDirection } from "@/lib/directory";
import { parseDraftClassSort, sortDraftClassPerformance, type DraftClassSort, } from "@/lib/draft-class-rankings";
import type { CSSProperties } from "react";

export const classPerformanceColumns = [
  {
    label: "Draft",
    sortKey: "class",
    align: "left",
    defaultDirection: "desc",
    description: "Draft year; open the class to inspect its players",
  },
  {
    label: "Picks",
    sortKey: "selections",
    description: "Official selections in the draft class",
  },
  {
    label: "NHL Rate",
    sortKey: "appearance-rate",
    description: "Share of selections who played at least one NHL game",
  },
  {
    label: "100+ Rate",
    sortKey: "hundred-rate",
    description: "Share of selections who reached 100 NHL games",
  },
  {
    label: "500+ Rate",
    sortKey: "five-hundred-rate",
    description: "Share of selections who reached 500 NHL games",
  },
  {
    label: "Games / Pick",
    sortKey: "average-games",
    description: "Average regular-season NHL games per official selection",
  },
  {
    label: "Points / Skater",
    sortKey: "points",
    description: "Career points divided by all non-goalie selections",
  },
  {
    label: "Game Score / Skater*",
    sortKey: "game-score",
    description:
      "Stored career MoneyPuck Game Score divided by all non-goalie selections",
  },
] as const;

export function ClassRankingsView({
  analytics,
  params,
}: {
  analytics: DraftAnalytics;
  params: Awaited<DraftsPageProps["searchParams"]>;
}) {
  const matureRows = analytics.classPerformance
    .filter(
      (draftClass) =>
        analytics.latestMatureDraftYear === null ||
        draftClass.draftYear <= analytics.latestMatureDraftYear,
    );
  const sort = parseDraftClassSort(firstQueryValue(params.sort));
  const direction = parseSortDirection(
    firstQueryValue(params.direction),
    "desc",
  );
  const rankedRows = sortDraftClassPerformance(matureRows, sort, direction);
  const classPage = paginate(
    rankedRows,
    parsePage(firstQueryValue(params.page)),
    15,
  );
  const rankedYears = matureRows.map((draftClass) => draftClass.draftYear);
  const earliestYear = rankedYears.length > 0 ? Math.min(...rankedYears) : null;
  const latestYear = rankedYears.length > 0 ? Math.max(...rankedYears) : null;

  return matureRows.length > 0 ? (
    <>
      <WorkspacePanel
        id="class-rankings"
        className="mt-7 scroll-mt-6"
        title="Draft Class Rankings"
        description={`Showing ${classPage.firstItem}–${classPage.lastItem} of ${classPage.totalItems} mature draft classes from ${earliestYear ?? "—"} through ${latestYear ?? "—"}. Sort any metric to rank the complete range; career totals continue to grow for active players.`}
      >
        <ClassPerformanceTable
          rows={classPage.items}
          comparisonRows={matureRows}
          sort={sort}
          direction={direction}
        />
        <Pagination
          path="/drafts"
          currentPage={classPage.currentPage}
          totalPages={classPage.totalPages}
          params={{ view: "classes", sort, direction }}
          scrollTarget="class-rankings"
        />
      </WorkspacePanel>
      <DeferredSection title="Class Distributions"><ClassRankingVisuals rows={matureRows} /></DeferredSection>
    </>
  ) : (
    <div className="workspace-empty-state mt-7">
      No mature draft classes are available to compare.
    </div>
  );
}

export function ClassPerformanceTable({
  rows,
  comparisonRows,
  sort,
  direction,
}: {
  rows: DraftClassPerformance[];
  comparisonRows: DraftClassPerformance[];
  sort: DraftClassSort;
  direction: "asc" | "desc";
}) {
  const advancedCoverageYears = comparisonRows
    .filter((row) => row.gameScorePerSkaterPick !== null)
    .map((row) => row.draftYear);
  const advancedCoverage =
    advancedCoverageYears.length > 0
      ? `${Math.min(...advancedCoverageYears)}–${Math.max(...advancedCoverageYears)}`
      : "Unavailable";
  const heatValues = {
    appearance: sortedValues(comparisonRows.map((row) => row.appearanceRate)),
    hundredGames: sortedValues(
      comparisonRows.map((row) => row.hundredGameRate),
    ),
    fiveHundredGames: sortedValues(
      comparisonRows.map((row) => row.fiveHundredGameRate),
    ),
    averageGames: sortedValues(comparisonRows.map((row) => row.averageGames)),
    points: sortedValues(
      comparisonRows.map((row) => row.pointsPerSkaterPick),
    ),
    gameScore: sortedValues(
      comparisonRows.map((row) => row.gameScorePerSkaterPick),
    ),
  };

  return (
    <>
<details><summary>Ranking Definitions and Heatmap</summary>      <aside
        className="workspace-class-ranking-guide"
        aria-label="How to read the class ranking metrics"
      >
        <p>
          <strong>How to read these rankings</strong>
          <span>
            Higher values indicate more career return from the full class.
            Older classes have had more time to accumulate games, points, and
            Game Score.
          </span>
        </p>
        <div className="workspace-class-heat-guide">
          <div aria-hidden="true">
            <span>Lower</span>
            <i />
            <span>Higher</span>
          </div>
          <p>
            The sorted metric becomes the heatmap. Five distinct color bands
            separate lower from higher values; choose another header to recolor
            the comparison.
          </p>
          <small>Game Score coverage: {advancedCoverage} draft classes</small>
        </div>
        <dl>
          <div>
            <dt>Appearance and milestone percentages</dt>
            <dd>How often picks reached the NHL, 100 games, or 500 games.</dd>
          </div>
          <div>
            <dt>NHL Games / Pick</dt>
            <dd>Average career regular-season games across every selection.</dd>
          </div>
          <div>
            <dt>Points / Skater Pick</dt>
            <dd>Average career points across every non-goalie selection.</dd>
          </div>
          <div>
            <dt>Game Score / Skater Pick*</dt>
            <dd>
              Average cumulative MoneyPuck all-around impact across every
              non-goalie selection.
            </dd>
          </div>
        </dl>
      </aside></details>
      <SortableTable secondaryColumns={[8]} initialExpanded={sort === "game-score"}
        defaultSortKey={sort}
        defaultDirection={direction}
        urlBacked
        scrollTarget="class-rankings"
        className="workspace-class-rankings-sort"
      >
        <TableScroll className="workspace-table-scroll">
          <table className="workspace-table workspace-table-dense workspace-class-rankings-table">
            <colgroup>
              <col className="workspace-class-rankings-class-col" />
              <col className="workspace-class-rankings-picks-col" />
              <col className="workspace-class-rankings-rate-col" />
              <col className="workspace-class-rankings-rate-col" />
              <col className="workspace-class-rankings-rate-col" />
              <col className="workspace-class-rankings-games-col" />
              <col className="workspace-class-rankings-points-col" />
              <col className="workspace-class-rankings-score-col" />
            </colgroup>
            <thead>
              <tr className="workspace-class-ranking-groups" aria-hidden="true" data-column-groups>
                <th colSpan={2}>Class</th>
                <th colSpan={3}>Milestone Rates</th>
                <th colSpan={2}>Career Return</th>
                <th>Advanced*</th>
              </tr>
              <tr>
                {classPerformanceColumns.map((column) => (
                  <SortableHeader key={column.sortKey} {...column} />
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((draftClass) => (
                <tr key={draftClass.draftYear}>
                  <td className="workspace-team-cell">
                    <Link
                      href={`/drafts?view=outcomes&year=${draftClass.draftYear}`}
                    >
                      <strong>{draftClass.draftYear} Draft</strong>
                    </Link>
                  </td>
                  <NumberCell value={draftClass.selections} />
                  <ClassMetricCell
                    metricKey="appearance-rate"
                    value={draftClass.appearanceRate}
                    displayValue={formatPercentage(draftClass.appearanceRate)}
                    comparisonValues={heatValues.appearance}
                  />
                  <ClassMetricCell
                    metricKey="hundred-rate"
                    value={draftClass.hundredGameRate}
                    displayValue={formatPercentage(draftClass.hundredGameRate)}
                    comparisonValues={heatValues.hundredGames}
                  />
                  <ClassMetricCell
                    metricKey="five-hundred-rate"
                    value={draftClass.fiveHundredGameRate}
                    displayValue={formatPercentage(
                      draftClass.fiveHundredGameRate,
                    )}
                    comparisonValues={heatValues.fiveHundredGames}
                  />
                  <ClassMetricCell
                    metricKey="average-games"
                    value={draftClass.averageGames}
                    displayValue={Math.round(draftClass.averageGames)}
                    comparisonValues={heatValues.averageGames}
                  />
                  <ClassMetricCell
                    metricKey="points"
                    value={draftClass.pointsPerSkaterPick}
                    displayValue={
                      draftClass.pointsPerSkaterPick === null
                        ? "—"
                        : Math.round(draftClass.pointsPerSkaterPick)
                    }
                    comparisonValues={heatValues.points}
                  />
                  <ClassMetricCell
                    metricKey="game-score"
                    value={draftClass.gameScorePerSkaterPick}
                    displayValue={
                      draftClass.gameScorePerSkaterPick === null
                        ? "—"
                        : Math.round(draftClass.gameScorePerSkaterPick)
                    }
                    comparisonValues={heatValues.gameScore}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
        <div className="workspace-table-note">
          Five heat bands show where a class falls within the full mature-class range
          for the sorted metric; they are not a combined grade. Rates use every
          official selection as the denominator. Points and Game Score exclude
          goalies but include zero-game skater picks. Game Score uses stored
          all-situations data from{" "}
          <a href="https://moneypuck.com" target="_blank" rel="noreferrer">
            MoneyPuck.com
          </a>. A class is shown as unavailable when any NHL skater lacks
          advanced coverage.
        </div>
      </SortableTable>
    </>
  );
}

export function ClassMetricCell({
  metricKey,
  value,
  displayValue,
  comparisonValues,
}: {
  metricKey: string;
  value: number | null;
  displayValue: number | string;
  comparisonValues: number[];
}) {
  if (value === null) {
    return (
      <td
        className="workspace-number-cell workspace-class-metric-cell is-unavailable"
        data-metric={metricKey}
      >
        {displayValue}
      </td>
    );
  }

  const rangePosition = relativeRangePosition(comparisonValues, value);
  const heatLevel = Math.min(4, Math.floor(rangePosition * 5));
  const style = {
    "--heat-background": `var(--heat-level-${heatLevel + 1})`,
    "--heat-foreground": `var(--heat-text-${heatLevel + 1})`,
  } as CSSProperties;

  return (
    <td
      className="workspace-number-cell workspace-class-metric-cell"
      data-heat-level={heatLevel + 1}
      data-metric={metricKey}
      data-sort-value={value}
      style={style}
    >
      {displayValue}
    </td>
  );
}
