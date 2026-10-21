"use client";
import { prepareScrollNavigation } from "@/components/shell/scroll-navigation";
import { useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";
import { LeaderboardTable } from "./sections/table";
import { LeaderboardState } from "./table-state";
import { sortAdvancedRows } from "@/lib/advanced-table";

export function PagedLeaderboard(
  props: ComponentProps<typeof LeaderboardTable>,
) {
  const params = useSearchParams();
  const requestedSort = params.get("tableSort");
  const skaterSortKeys = ["player", "games", "iceTime", "pointsPer60", "individualXGoalsPer60", "corsiPercentage", "onIceXGoalsForPer60", "onIceXGoalsAgainstPer60", "xgPercentage", "hdXgPercentage"];
  const goalieSortKeys = ["goalie", "games", "iceTime", "goalsSavedPer60", "goalieXGoalsAgainstPer60", "highDangerGoalsSaved", "mediumDangerGoalsSaved", "lowDangerGoalsSaved", "reboundsPer60"];
  const sort = props.type === "skaters"
    ? requestedSort && skaterSortKeys.includes(requestedSort) ? requestedSort : "pointsPer60"
    : props.type === "goalies"
      ? requestedSort && goalieSortKeys.includes(requestedSort) ? requestedSort : "goalsSavedPer60"
      : requestedSort ?? "xgPercentage";
  const direction = params.get("tableDirection") === "asc" ? "asc" : "desc";
  if (props.type === "teams") return <LeaderboardTable {...props} />;
  const sorted = sortAdvancedRows<(typeof props.rows)[number]>(
    props.rows,
    sort,
    direction,
  );
  const pages = Math.max(1, Math.ceil(sorted.length / 50));
  const page = Math.min(
    pages,
    Math.max(1, Math.floor(Number(params.get("tablePage")) || 1)),
  );
  const update = (changes: Record<string, string>, sorting = false) => {
    const url = new URL(window.location.href);
    Object.entries(changes).forEach(([key, value]) =>
      url.searchParams.set(key, value),
    );
    if (!sorting) url.hash = "advanced-results";
    prepareScrollNavigation(url.href, sorting ? "preserve" : "results");
    window.history.pushState(null, "", url);
  };
  return (
    <LeaderboardState.Provider
      value={{
        total: sorted.length,
        sort,
        direction,
        onSortChange: (key, dir) =>
          update({ tableSort: key, tableDirection: dir, tablePage: "1" }, true),
      }}
    >
      <div id="advanced-results" tabIndex={-1}>
        <LeaderboardTable
          {...props}
          rows={sorted.slice((page - 1) * 50, page * 50) as typeof props.rows}
        />
      </div>
      <nav
        className="workspace-pagination mt-5"
        aria-label="Advanced results pages"
      >
        <button
          type="button"
          disabled={page === 1}
          onClick={() => update({ tablePage: String(page - 1) })}
        >
          ← Previous
        </button>
        <span role="status">
          Page {page} of {pages} · {sorted.length} rows in this sample
        </span>
        <button
          type="button"
          disabled={page === pages}
          onClick={() => update({ tablePage: String(page + 1) })}
        >
          Next →
        </button>
      </nav>
    </LeaderboardState.Provider>
  );
}
