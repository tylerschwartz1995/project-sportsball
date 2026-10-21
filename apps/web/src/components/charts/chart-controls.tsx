import type { ReactNode } from "react";

export function ChartFilterGroup({
  label,
  hideLabel = false,
  children,
}: {
  label: string;
  hideLabel?: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset className="workspace-chart-filter-group">
      <legend className={hideLabel ? "sr-only" : undefined}>{label}</legend>
      <div>{children}</div>
    </fieldset>
  );
}

export function ChartFilterButton({
  active,
  disabled = false,
  label,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
