"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Measure both the viewport and table: player selection and zoom can change either. */
export function ComparisonScrollRegion({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const region = ref.current;
    if (!region) return;
    const measure = () => setOverflow(region.scrollWidth > region.clientWidth + 1);
    const observer = new ResizeObserver(measure);
    observer.observe(region);
    const table = region.querySelector("table");
    if (table) observer.observe(table);
    measure();
    return () => observer.disconnect();
  }, [children]);
  return (
    <div
      ref={ref}
      className="workspace-table-scroll modern-comparison-scroll"
      data-overflow={overflow}
      tabIndex={0}
      role="region"
      aria-label="Player comparison table"
    >
      {children}
    </div>
  );
}
