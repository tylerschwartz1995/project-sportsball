"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/** Collapses optional controls on phones while keeping the same form and URL state. */
export function MobileFilterPanel({
  children,
  label = "Filters & Sort",
}: {
  children: ReactNode;
  label?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = ref.current;
    const restore = (event: Event) =>
      setExpanded(Boolean((event as CustomEvent<boolean>).detail));
    panel?.addEventListener("restore-scroll-disclosure", restore);
    return () => panel?.removeEventListener("restore-scroll-disclosure", restore);
  }, []);

  return (
    <div
      ref={ref}
      className="mobile-filter-panel"
      data-scroll-disclosure
      data-expanded={expanded}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded(value => !value)}
      >
        {label}
        <span aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>
      <div id={id} data-scroll-generated-id className="mobile-filter-content">
        {children}
      </div>
    </div>
  );
}
