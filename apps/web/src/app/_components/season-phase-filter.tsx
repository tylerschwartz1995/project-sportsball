import Link from "next/link";

import type { GamePhase, SeasonPhase } from "@/contracts/season-phase";

type PhaseOption = {
  value: GamePhase;
  label: string;
};

type SeasonPhaseFilterProps = {
  active: GamePhase;
  path: string;
  params?: Record<string, string | number | undefined>;
  includeAll?: boolean;
  label?: string;
};

export function SeasonPhaseFilter({
  active,
  path,
  params = {},
  includeAll = false,
  label = "Season phase",
}: SeasonPhaseFilterProps) {
  const options: PhaseOption[] = [
    ...(includeAll ? [{ value: "all" as const, label: "All games" }] : []),
    { value: "regular", label: "Regular Season" },
    { value: "playoffs", label: "Playoffs" },
  ];

  return (
    <nav className="workspace-phase-filter" aria-label={label}>
      <span>{label}</span>
      <div>
        {options.map((option) => (
          <Link
            key={option.value}
            href={buildPhaseHref(path, params, option.value)}
            aria-current={active === option.value ? "page" : undefined}
          >
            {option.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function buildPhaseHref(
  path: string,
  params: Record<string, string | number | undefined>,
  phase: GamePhase,
): string {
  const search = new URLSearchParams();

  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && name !== "phase" && name !== "page") {
      search.set(name, String(value));
    }
  }
  search.set("phase", phase);

  return `${path}?${search.toString()}`;
}

export type { SeasonPhase };
