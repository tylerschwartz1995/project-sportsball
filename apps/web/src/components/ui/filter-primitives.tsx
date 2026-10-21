import { ContextLink as Link } from "@/components/ui/context-link";
import type { ReactNode } from "react";

export function FilterActions({
  clearHref,
  applyLabel = "Apply Filters",
  autoApply = false,
  clearLabel = "Clear Filters",
  canClear = true,
  children,
}: {
  clearHref: string;
  applyLabel?: string;
  autoApply?: boolean;
  clearLabel?: string;
  canClear?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="workspace-filter-actions">
      {!autoApply ? <button type="submit">{applyLabel}</button> : null}
      {canClear ? (
        <Link preserveDisplay href={clearHref}>{clearLabel}</Link>
      ) : null}
      {children}
    </div>
  );
}
