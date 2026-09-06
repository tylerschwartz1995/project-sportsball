"use client";
import type { ReactNode } from "react";
import { useUrlChoice } from "@/components/ui/use-shareable-state";
export function MobileDataView({ children }: { children: ReactNode }) {
  const [view, setView] = useUrlChoice(
    "resultView",
    ["cards", "table"],
    "table",
  );
  return (
    <div className="ux-player-results" data-mobile-view={view}>
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
