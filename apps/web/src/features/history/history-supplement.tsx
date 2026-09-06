"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
const Content = dynamic(() => import("./history-supplement-content"), { loading: () => <p role="status">Loading history…</p> });
export function HistorySupplement({ phase, view }: { phase: "regular" | "playoffs"; view: "records" | "skaters" | "goalies" }) {
  const [open, setOpen] = useState(false);
  return <details className="mt-5" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{view === "records" ? "Record Progression" : "League Environment and Decade Leaders"}</summary>
    {open ? <Content key={`${phase}:${view}`} phase={phase} view={view} /> : null}
  </details>;
}
