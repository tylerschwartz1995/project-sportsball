import type { ReactNode } from "react";

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  tone = "cyan",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "cyan" | "violet";
}) {
  return (
    <div className="modern-section-heading flex flex-wrap items-end justify-between gap-4">
      <div>
        <p
          className={`font-mono text-xs uppercase tracking-[0.18em] ${
            tone === "violet" ? "text-[var(--accent-secondary)]" : "text-[var(--accent)]"
          }`}
        >
          {eyebrow}
        </p>
        <h3 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-[var(--foreground)]">
          {title}
        </h3>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function DataTableShell({ children }: { children: ReactNode }) {
  return <div className="data-table-shell mt-5">{children}</div>;
}

export function MetricTile({
  label,
  value,
  detail,
  emphasis = false,
}: {
  label: string;
  value: string | number;
  detail?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={
        emphasis
          ? "rounded-xl border border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] bg-[var(--accent-soft)] p-4"
          : "rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4"
      }
    >
      <dt className="text-sm font-medium uppercase tracking-[0.13em] text-[var(--muted)]">
        {label}
      </dt>
      <dd
        className={`mt-2 text-xl font-semibold tabular-nums ${
          emphasis ? "text-[var(--accent)]" : "text-[var(--foreground)]"
        }`}
      >
        {value}
      </dd>
      {detail ? (
        <p className="mt-1 text-xs tabular-nums text-[var(--muted)]">{detail}</p>
      ) : null}
    </div>
  );
}
