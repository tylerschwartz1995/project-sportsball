import { ContextLink as Link } from "@/components/ui/context-link";
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
        {autoApply ? <span>Changes apply immediately.</span> : null}
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
        <Link preserveDisplay href={clearHref}>{clearLabel}</Link>
      ) : null}
      {children}
    </div>
  );
}
