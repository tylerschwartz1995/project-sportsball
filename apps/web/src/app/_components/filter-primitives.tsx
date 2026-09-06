import Link from "next/link";
import type { ReactNode } from "react";

export function FilterHeader({
  title = "Filters",
  description,
  activeCount = 0,
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
      {activeCount > 0 ? <small>{activeCount} active {activeCount === 1 ? "filter" : "filters"}</small> : null}
    </header>
  );
}

export function FilterActions({
  clearHref,
  applyLabel = "Apply Filters",
  clearLabel = "Clear Filters",
  canClear = true,
  children,
}: {
  clearHref: string;
  applyLabel?: string;
  clearLabel?: string;
  canClear?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="workspace-filter-actions">
      <button type="submit">
        {applyLabel}
      </button>
      {canClear ? (
        <Link href={clearHref}>{clearLabel}</Link>
      ) : null}
      {children}
    </div>
  );
}
