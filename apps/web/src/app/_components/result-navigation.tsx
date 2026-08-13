import Link from "next/link";

import { Pagination } from "@/app/_components/pagination";

export function ResultNavigation({
  path,
  params,
  currentPage,
  totalPages,
  firstItem,
  lastItem,
  totalItems,
  pageSize,
  pageSizes = [25, 50, 100],
  scrollTarget,
}: {
  path: string;
  params: Record<string, string | number | undefined>;
  currentPage: number;
  totalPages: number;
  firstItem: number;
  lastItem: number;
  totalItems: number;
  pageSize: number;
  pageSizes?: readonly number[];
  scrollTarget: string;
}) {
  return (
    <div className="workspace-result-navigation">
      <div className="workspace-result-summary">
        <span>
          {firstItem.toLocaleString()}–{lastItem.toLocaleString()} of{" "}
          {totalItems.toLocaleString()}
        </span>
        <div aria-label="Rows per page">
          <span>Rows</span>
          {pageSizes.map((size) => (
            <Link
              key={size}
              href={buildSizeHref(path, params, size, scrollTarget)}
              aria-current={size === pageSize ? "true" : undefined}
            >
              {size}
            </Link>
          ))}
        </div>
      </div>
      <Pagination
        path={path}
        currentPage={currentPage}
        totalPages={totalPages}
        params={{ ...params, perPage: pageSize }}
        scrollTarget={scrollTarget}
      />
    </div>
  );
}

function buildSizeHref(
  path: string,
  params: Record<string, string | number | undefined>,
  pageSize: number,
  scrollTarget: string,
): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && key !== "page") {
      search.set(key, String(value));
    }
  });
  search.set("perPage", String(pageSize));
  return `${path}?${search.toString()}#${encodeURIComponent(scrollTarget)}`;
}
