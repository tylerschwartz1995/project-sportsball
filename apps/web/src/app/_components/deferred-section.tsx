"use client";

import { useId, useState, type ReactNode } from "react";
import { useClientReady } from "@/app/_components/use-client-ready";

/** Mount expensive supplementary content only when requested. */
export function DeferredSection({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ready = useClientReady();
  return (
    <section className="mt-5">
      <button
        type="button"
        className="workspace-disclosure-toggle"
        disabled={!ready}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <span className="workspace-disclosure-icon" aria-hidden="true" /> {title}
      </button>
      <div id={id}>{open ? children : null}</div>
    </section>
  );
}
