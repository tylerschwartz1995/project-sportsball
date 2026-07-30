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
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p
          className={`font-mono text-xs uppercase tracking-[0.18em] ${
            tone === "violet" ? "text-violet-300" : "text-cyan-300"
          }`}
        >
          {eyebrow}
        </p>
        <h3 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-white">
          {title}
        </h3>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
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
          ? "rounded-xl border border-cyan-300/20 bg-cyan-300/[0.07] p-4"
          : "rounded-xl border border-white/[0.07] bg-black/10 p-4"
      }
    >
      <dt className="text-[0.68rem] font-medium uppercase tracking-[0.13em] text-slate-500">
        {label}
      </dt>
      <dd
        className={`mt-2 text-xl font-semibold tabular-nums ${
          emphasis ? "text-cyan-100" : "text-white"
        }`}
      >
        {value}
      </dd>
      {detail ? (
        <p className="mt-1 text-xs tabular-nums text-slate-500">{detail}</p>
      ) : null}
    </div>
  );
}
