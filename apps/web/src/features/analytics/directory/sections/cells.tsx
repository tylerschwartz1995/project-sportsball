import Link from "@/components/ui/exploration-link";
import type { TeamIdentity } from "@/contracts/team";
import { TeamLogo } from "@/features/teams/team-logo";
export function EntityCell({
  href,
  name,
  detail,
  team,
  metricGroup,
}: {
  href: string;
  name: string;
  detail: string;
  team?: TeamIdentity;
  metricGroup?: string;
}) {
  return (
    <td
      className="workspace-sticky-entity px-4 py-3 text-left"
      data-column-group={metricGroup}
    >
      <div className="flex items-center gap-2">
        {team ? (
          <TeamLogo {...team} size="tiny" decorative />
        ) : null}
        <div>
          <Link
            href={href}
            className="workspace-entity-name font-medium text-[var(--foreground)] transition hover:text-[var(--accent)]"
          >
            {name}
          </Link>
          <span className="mt-0.5 block max-w-48 truncate text-xs text-[var(--muted)]">
            {detail}
          </span>
        </div>
      </div>
    </td>
  );
}

export function ValueCell({
  value,
  highlight = false,
  metricGroup,
}: {
  value: string;
  highlight?: boolean;
  metricGroup?: string;
}) {
  return (
    <td
      className={`workspace-semantic-number px-4 py-3 text-center tabular-nums ${highlight ? "font-semibold text-[var(--accent-secondary)]" : "text-[var(--foreground-soft)]"
        }`}
      data-column-group={metricGroup}
    >
      {value}
    </td>
  );
}
