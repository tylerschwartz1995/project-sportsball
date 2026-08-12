import Link from "next/link";
import type { ReactNode } from "react";

export function FilterHeader({
  title = "Filters",
  description,
  activeCount = 0,
  autoApply = false,
}: {
  title?: string;
  description?: string;
  activeCount?: number;
  autoApply?: boolean;
}) {
  return (
    <header className="workspace-filter-header">
      <div>
        <strong>{title}</strong>
        {description ? <span>{description}</span> : null}
      </div>
      <small>
        {activeCount > 0
          ? `${activeCount} active ${activeCount === 1 ? "filter" : "filters"}`
          : autoApply
            ? "Updates automatically"
            : "No extra filters"}
      </small>
    </header>
  );
}

export function FilterActions({
  clearHref,
  applyLabel = "Apply Filters",
  clearLabel = "Clear Filters",
  accent = "primary",
  children,
}: {
  clearHref: string;
  applyLabel?: string;
  clearLabel?: string;
  accent?: "primary" | "secondary";
  children?: ReactNode;
}) {
  return (
    <div className="workspace-filter-actions">
      <button type="submit" data-accent={accent}>
        {applyLabel}
      </button>
      <Link href={clearHref}>{clearLabel}</Link>
      {children}
    </div>
  );
}
