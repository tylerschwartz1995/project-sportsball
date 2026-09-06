"use client";

import { IntentLink as Link } from "@/components/ui/intent-link";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { SortIndicator } from "@/components/ui/sizing-icons";
import { useSortableTable } from "@/components/ui/sortable-table";
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
    description ??
    (typeof label === "string" ? metricDefinition(label) : undefined);
  const helpId = useId();
  const [tooltipAnchor, setTooltipAnchor] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!tooltipAnchor) return;
    const dismiss = () => setTooltipAnchor(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        dismiss();
      }
    };
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [tooltipAnchor]);
  const tooltipEvents = {
    onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
      if (effectiveDescription) setTooltipAnchor(event.currentTarget);
    },
    onMouseLeave: () => setTooltipAnchor(null),
    onFocus: (event: React.FocusEvent<HTMLElement>) => {
      if (effectiveDescription) setTooltipAnchor(event.currentTarget);
    },
    onBlur: () => setTooltipAnchor(null),
  };
  const href = sortHref(sortKey, defaultDirection);
  const controlClassName = `relative flex min-h-11 w-full items-center gap-1 rounded-sm px-3 py-3 transition hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--accent)] ${
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
          isActive ? "text-[var(--accent)]" : "text-[var(--muted)]"
        }`}
      >
        <SortIndicator direction={isActive ? direction : undefined} />
      </span>
      {effectiveDescription ? (
        tooltipAnchor ? (
          <MetricTooltip id={helpId} anchor={tooltipAnchor}>
            {effectiveDescription}
          </MetricTooltip>
        ) : (
          <span id={helpId} hidden>
            {effectiveDescription}
          </span>
        )
      ) : null}
    </>
  );

  return (
    <th
      scope="col"
      aria-label={typeof label === "string" ? label : undefined}
      aria-sort={
        isActive ? (direction === "asc" ? "ascending" : "descending") : "none"
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
      <div className="ux-column-heading">
        {href ? (
          <Link
            href={href}
            {...tooltipEvents}
            aria-describedby={effectiveDescription ? helpId : undefined}
            className={controlClassName}
          >
            {content}
          </Link>
        ) : (
          <button
            type="button"
            onClick={(event) => sort(event, sortKey, defaultDirection)}
            {...tooltipEvents}
            aria-describedby={effectiveDescription ? helpId : undefined}
            className={controlClassName}
          >
            {content}
          </button>
        )}
      </div>
    </th>
  );
}

/** Render outside the table scroll boundary, and keep the bubble in the viewport. */
function MetricTooltip({
  id,
  anchor,
  children,
}: {
  id: string;
  anchor: HTMLElement;
  children: ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const tooltip = ref.current;
    if (!tooltip) return;
    const target = anchor.getBoundingClientRect();
    const bubble = tooltip.getBoundingClientRect();
    const inset = 8;
    const left = Math.max(
      inset,
      Math.min(
        target.left + (target.width - bubble.width) / 2,
        window.innerWidth - bubble.width - inset,
      ),
    );
    const below = target.bottom + inset;
    const top =
      below + bubble.height <= window.innerHeight - inset
        ? below
        : Math.max(inset, target.top - bubble.height - inset);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.visibility = "visible";
  }, [anchor, children]);
  return createPortal(
    <span
      ref={ref}
      id={id}
      role="tooltip"
      className="workspace-metric-tooltip"
      style={{ visibility: "hidden" }}
    >
      {children}
    </span>,
    anchor.closest("dialog") ?? document.body,
  );
}
