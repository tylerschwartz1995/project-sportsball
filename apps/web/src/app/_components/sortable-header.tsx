"use client";

import Link from "next/link";
import { useId, type ReactNode } from "react";

import { useSortableTable } from "@/app/_components/sortable-table";
import { metricDefinition } from "@/lib/metric-definitions";

type SortDirection = "asc" | "desc";

type SortableHeaderProps = {
  label: ReactNode;
  sortKey: string;
  align?: "left" | "center" | "right";
  defaultDirection?: SortDirection;
  description?: string;
  nowrap?: boolean;
  sticky?: boolean;
  metricGroup?: string;
};

export function SortableHeader({
  label,
  sortKey,
  align = "center",
  defaultDirection = "desc",
  description,
  nowrap = false,
  sticky = false,
  metricGroup,
}: SortableHeaderProps) {
  const { key, direction, sort, sortHref } = useSortableTable();
  const isActive = key === sortKey;
  const effectiveDescription =
    description ?? (typeof label === "string" ? metricDefinition(label) : undefined);
  const helpId = useId();
  const href = sortHref(sortKey, defaultDirection);
  const controlClassName = `relative flex min-h-11 w-full items-center gap-1 rounded-sm px-3 py-3 transition hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-cyan-300 ${
    nowrap ? "whitespace-nowrap" : ""
  } ${
    align === "left"
      ? "justify-start"
      : align === "center"
        ? "justify-center"
        : "justify-end"
  }`;
  const content = (
    <>
      {label}
      <span
        aria-hidden="true"
        className={`shrink-0 ${
          isActive ? "text-cyan-300" : "text-slate-700"
        }`}
      >
        {isActive ? (direction === "asc" ? "↑" : "↓") : "↕"}
      </span>
      {effectiveDescription ? (
        <span id={helpId} role="tooltip" className="workspace-metric-tooltip">
          {effectiveDescription}
        </span>
      ) : null}
    </>
  );

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
      data-column-group={metricGroup}
      className={`workspace-sortable-header p-0 font-medium ${
        sticky ? "workspace-sticky-entity" : ""
      } ${
        align === "left"
          ? "text-left"
          : align === "center"
            ? "text-center"
            : "text-right"
      }`}
    >
      {href ? (
        <Link
          href={href}
          title={effectiveDescription}
          aria-describedby={effectiveDescription ? helpId : undefined}
          className={controlClassName}
        >
          {content}
        </Link>
      ) : (
        <button
          type="button"
          onClick={(event) => sort(event, sortKey, defaultDirection)}
          title={effectiveDescription}
          aria-describedby={effectiveDescription ? helpId : undefined}
          className={controlClassName}
        >
          {content}
        </button>
      )}
    </th>
  );
}
