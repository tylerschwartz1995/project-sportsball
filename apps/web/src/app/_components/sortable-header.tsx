import Link from "next/link";

type SortDirection = "asc" | "desc";

type SortableHeaderProps = {
  label: string;
  sortKey: string;
  activeSort: string;
  direction: SortDirection;
  path: string;
  params: Record<string, string | number | undefined>;
  align?: "left" | "center" | "right";
  defaultDirection?: SortDirection;
};

export function SortableHeader({
  label,
  sortKey,
  activeSort,
  direction,
  path,
  params,
  align = "right",
  defaultDirection = "desc",
}: SortableHeaderProps) {
  const isActive = activeSort === sortKey;
  const nextDirection = isActive
    ? direction === "desc"
      ? "asc"
      : "desc"
    : defaultDirection;
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && key !== "page") {
      search.set(key, String(value));
    }
  });
  search.set("sort", sortKey);
  search.set("dir", nextDirection);

  return (
    <th
      scope="col"
      aria-sort={
        isActive
          ? direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
      className={`px-3 py-3 font-medium ${
        align === "left"
          ? "text-left"
          : align === "center"
            ? "text-center"
            : "text-right"
      }`}
    >
      <Link
        href={`${path}?${search.toString()}`}
        className="inline-flex items-center gap-1.5 rounded-sm transition hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
      >
        {label}
        <span
          aria-hidden="true"
          className={isActive ? "text-cyan-300" : "text-slate-700"}
        >
          {isActive ? (direction === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </Link>
    </th>
  );
}
