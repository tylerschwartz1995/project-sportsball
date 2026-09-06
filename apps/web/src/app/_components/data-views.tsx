"use client";
import { useClientReady } from "@/app/_components/use-client-ready";
import type { ReactNode } from "react";
import { useUrlChoice } from "@/app/_components/use-shareable-state";

export function DataViews({ table, charts }: { table: ReactNode; charts: ReactNode }) {
  const ready = useClientReady();
  const [view, setView] = useUrlChoice("display", ["table", "charts"], "table");
  return <section>
    <div className="workspace-presentation-tabs" role="group" aria-label="Analytics presentation">
      <button type="button" disabled={!ready} aria-pressed={view === "table"} onClick={() => setView("table")}>Table</button>
      <button type="button" disabled={!ready} aria-pressed={view === "charts"} onClick={() => setView("charts")}>Charts</button>
    </div>
    {view === "table" ? table : charts}
  </section>;
}
