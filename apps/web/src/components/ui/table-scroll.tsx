"use client";

import { useEffect, useId, useRef, useState, type ComponentProps } from "react";

/** Native scrolling with measured guidance; server-rendered table semantics stay intact. */
export function TableScroll({
  children,
  className = "",
  ...props
}: ComponentProps<"div">) {
  const hintId = useId();
  const ref = useRef<HTMLDivElement>(null);
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
  );
}
