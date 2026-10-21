import Link from "@/components/ui/exploration-link";

export function DirectoryEmptyState({
  clearHref,
  query,
}: {
  clearHref: string;
  query: string;
}) {
  return (
    <div className="workspace-empty-state mt-5">
      <strong>No players match these filters.</strong>
      <span>
        Try a broader search or remove optional filters for this season.
      </span>
      <Link href={`/search?q=${encodeURIComponent(query)}`}>
        Search All Seasons for {query || "a Player"} →
      </Link>
      <Link href={clearHref}>Clear filters</Link>
    </div>
  );
}

export function NumericCell({
  value,
  highlight = false,
}: {
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <td
      className={`workspace-semantic-number px-3 py-3 text-center tabular-nums ${highlight ? "font-semibold text-[var(--accent)]" : "text-[var(--foreground-soft)]"
        }`}
    >
      {value}
    </td>
  );
}
