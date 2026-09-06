"use client";
import { useState } from "react";
import { SeasonUnitTables } from "@/app/_components/season-unit-tables";
import type { ComponentProps } from "react";
import { useClientReady } from "@/app/_components/use-client-ready";

export function TeamUnitViews(props: ComponentProps<typeof SeasonUnitTables>) {
  const [unit, setUnit] = useState<"line" | "pairing">("line");
  const ready = useClientReady();
  return <>
    <div className="workspace-presentation-tabs" role="group" aria-label="Combination type">
      <button type="button" disabled={!ready} aria-pressed={unit === "line"} onClick={() => setUnit("line")}>Forward Lines</button>
      <button type="button" disabled={!ready} aria-pressed={unit === "pairing"} onClick={() => setUnit("pairing")}>Defensive Pairings</button>
    </div>
    <SeasonUnitTables {...props} only={unit} />
  </>;
}
