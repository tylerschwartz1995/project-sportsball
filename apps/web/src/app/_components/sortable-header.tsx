"use client";

import { useSortableTable } from "@/app/_components/sortable-table";

type SortDirection = "asc" | "desc";

type SortableHeaderProps = {
  label: string;
  sortKey: string;
  align?: "left" | "center" | "right";
  defaultDirection?: SortDirection;
};

export function SortableHeader({
  label,
  sortKey,
  align = "right",
  defaultDirection = "desc",
}: SortableHeaderProps) {
  const { key, direction, sort } = useSortableTable();
  const isActive = key === sortKey;

  return (
    <th
      scope="col"
      aria-sort={
        isActive
          ? direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
      className={`px-3 py-3 font-medium ${
        align === "left"
          ? "text-left"
          : align === "center"
            ? "text-center"
            : "text-right"
      }`}
    >
      <button
        type="button"
        onClick={(event) => sort(event, sortKey, defaultDirection)}
        className="inline-flex items-center gap-1.5 rounded-sm transition hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
      >
        {label}
        <span
          aria-hidden="true"
          className={isActive ? "text-cyan-300" : "text-slate-700"}
        >
          {isActive ? (direction === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}
