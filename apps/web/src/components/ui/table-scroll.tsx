"use client";

import { mobileColumnGroups, type MobileColumn } from "./mobile-table-columns";
import { useEffect, useId, useRef, useState, type ComponentProps } from "react";

/** Phone metric groups enhance the existing server-rendered, sortable table. */
export function TableScroll({
  children,
  className = "",
  ...props
}: ComponentProps<"div">) {
  const hintId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState<MobileColumn[]>([]);
  const [identity, setIdentity] = useState(0);
  const [group, setGroup] = useState(0);
  const schemaRef = useRef("");
  const groups = mobileColumnGroups(columns, identity);
  const selectedGroup = Math.min(group, Math.max(0, groups.length - 1));

  useEffect(() => {
    const region = ref.current;
    const table = region?.querySelector("table");
    if (!table) return;
    // Explicit roles retain table semantics when phone CSS uses grid rows.
    table.setAttribute("role", "table");
    for (const section of [table.tHead, ...Array.from(table.tBodies), table.tFoot]) {
      if (!section) continue;
      section.setAttribute("role", "rowgroup");
      for (const row of Array.from(section.rows)) {
        row.setAttribute("role", "row");
        for (const cell of Array.from(row.cells)) {
          cell.setAttribute("role", section === table.tHead ? "columnheader" : cell.tagName === "TH" ? "rowheader" : "cell");
        }
      }
    }
    if (table.matches(".workspace-scoring-table, .mobile-schedule-table")) return;
    const annotate = () => {
      const headers = Array.from(table.tHead?.rows[0]?.cells ?? []);
      if (headers.length < 4) return;
      const entity = table.classList.contains("workspace-standings-table") ? 1 : 0;
      const nextColumns = headers.map((cell, index) => ({ index, label: cell.getAttribute("aria-label") ?? cell.textContent?.trim() ?? "" }));
      setIdentity(entity);
      setColumns(previous => JSON.stringify(previous) === JSON.stringify(nextColumns) ? previous : nextColumns);
      const signature = JSON.stringify(nextColumns);
      const changed = schemaRef.current !== signature;
      schemaRef.current = signature;
      if (changed) setGroup(0);
      const choices = mobileColumnGroups(nextColumns, entity);
      const active = choices[changed ? 0 : Math.min(group, choices.length - 1)] ?? [];
      table.style.setProperty("--mobile-column-count", String(active.length || 1));
      const visible = new Set([entity, ...active.map(column => column.index)]);
      table.dataset.mobileColumns = "true";
      table.setAttribute("role", "table");
      for (const section of [table.tHead, ...Array.from(table.tBodies), table.tFoot]) {
        if (!section) continue;
        section.setAttribute("role", "rowgroup");
        for (const row of Array.from(section.rows)) {
          row.setAttribute("role", "row");
          let index = 0;
          for (const cell of Array.from(row.cells)) {
            const span = cell.colSpan;
            const isEntity = index <= entity && entity < index + span;
            cell.dataset.mobileEntity = String(isEntity);
            cell.dataset.mobileVisible = String(isEntity || Array.from({ length: span }, (_, offset) => index + offset).some(i => visible.has(i)));
            cell.dataset.mobileLabel = nextColumns[index]?.label ?? "";
            cell.setAttribute("role", section === table.tHead ? "columnheader" : cell.tagName === "TH" ? "rowheader" : "cell");
            index += span;
          }
        }
      }
    };
    annotate();
    const observer = new MutationObserver(annotate);
    observer.observe(table, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [children, group]);
  const [overflow, setOverflow] = useState({ x: false, y: false });

  useEffect(() => {
    const region = ref.current;
    if (!region) return;
    const measure = () => {
      const x = region.scrollWidth > region.clientWidth + 1;
      const y = region.scrollHeight > region.clientHeight + 1;
      setOverflow(previous =>
        previous.x === x && previous.y === y ? previous : { x, y },
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(region);
    for (const table of region.querySelectorAll("table")) observer.observe(table);
    const mutations = new MutationObserver(measure);
    mutations.observe(region, { childList: true, subtree: true });
    measure();
    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [children]);

  const hint = [
    overflow.x && "Scroll for more columns →",
    overflow.y && "More rows below ↓",
  ].filter(Boolean).join(" · ");
  return (
    <>
    {groups.length > 1 && (
      <label className="mobile-column-picker">
        Columns
        <select aria-label="Table columns" value={selectedGroup} onChange={event => setGroup(Number(event.target.value))}>
          {groups.map((items, index) => (
            <option key={index} value={index}>{items.map(column => column.label).join(" · ")}</option>
          ))}
        </select>
      </label>
    )}
    <div
      {...props}
      ref={ref}
      className={`responsive-table-scroll ${className}`}
      data-overflow={overflow.x}
      data-overflow-y={overflow.y}
      data-scroll-hint={hint}
      role="region"
      aria-label={props["aria-label"] ?? "Statistics table"}
      aria-describedby={hint ? hintId : undefined}
      tabIndex={overflow.x || overflow.y ? 0 : undefined}
    >
      <span id={hintId} className="sr-only">{hint}</span>
      {children}
    </div>
    </>
  );
}
