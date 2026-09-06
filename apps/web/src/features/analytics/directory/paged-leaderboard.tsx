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
  const sort =
    params.get("tableSort") ??
    (props.type === "goalies" ? "goalsSaved" : "gameScore");
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
  const update = (changes: Record<string, string>) => {
    const url = new URL(window.location.href);
    Object.entries(changes).forEach(([key, value]) =>
      url.searchParams.set(key, value),
    );
    url.hash = "advanced-results";
    prepareScrollNavigation(url.href, "results");
    window.history.pushState(null, "", url);
  };
  return (
    <LeaderboardState.Provider
      value={{
        total: sorted.length,
        sort,
        direction,
        onSortChange: (key, dir) =>
          update({ tableSort: key, tableDirection: dir, tablePage: "1" }),
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
