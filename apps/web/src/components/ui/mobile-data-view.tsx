"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useUrlChoice } from "@/components/ui/use-shareable-state";
export function MobileDataView({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    for (const table of ref.current?.querySelectorAll("table") ?? []) {
      const labels = Array.from(table.tHead?.rows.item(0)?.cells ?? [], cell => cell.getAttribute("aria-label") ?? cell.textContent ?? "");
      for (const row of table.tBodies.item(0)?.rows ?? []) {
        Array.from(row.cells).forEach((cell, index) => { cell.dataset.label = labels[index]; });
      }
    }
  });
  const [view, setView] = useUrlChoice(
    "resultView",
    ["cards", "table"],
    "table",
  );
  return (
    <div ref={ref} className="ux-player-results" data-mobile-view={view}>
      <div
        className="ux-mobile-data-switch"
        role="group"
        aria-label="Player results presentation"
      >
        <button
          type="button"
          aria-pressed={view === "table"}
          onClick={() => setView("table")}
        >
          Compact Table
        </button>
        <button
          type="button"
          aria-pressed={view === "cards"}
          onClick={() => setView("cards")}
        >
          Player Cards
        </button>
      </div>
      {children}
    </div>
  );
}
