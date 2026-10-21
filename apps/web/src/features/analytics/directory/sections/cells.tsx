import { PlayerTableIdentity } from "@/features/players/player-table-identity";
import type { TeamIdentity } from "@/contracts/team";
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
      <PlayerTableIdentity href={href} name={name} position={detail} teams={team ? [team] : undefined} />
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
      className={`workspace-semantic-number px-4 py-3 text-center tabular-nums ${highlight ? "font-semibold text-[var(--accent)]" : "text-[var(--foreground-soft)]"
        }`}
      data-column-group={metricGroup}
    >
      {value}
    </td>
  );
}
