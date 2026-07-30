import Link from "next/link";

type PaginationProps = {
  path: string;
  currentPage: number;
  totalPages: number;
  params: Record<string, string | number | undefined>;
};

export function Pagination({
  path,
  currentPage,
  totalPages,
  params,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const visiblePages = pageWindow(currentPage, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex flex-wrap items-center justify-between gap-3"
    >
      <PageLink
        href={buildPageHref(path, params, currentPage - 1)}
        disabled={currentPage === 1}
      >
        ← Previous
      </PageLink>
      <div className="flex flex-wrap items-center justify-center gap-1">
        {visiblePages.map((page) => (
          <Link
            key={page}
            href={buildPageHref(path, params, page)}
            aria-current={page === currentPage ? "page" : undefined}
            className={`min-w-10 rounded-lg px-3 py-2 text-center text-sm font-medium transition ${
              page === currentPage
                ? "bg-cyan-300 text-slate-950"
                : "border border-white/10 text-slate-300 hover:border-white/20 hover:text-white"
            }`}
          >
            {page}
          </Link>
        ))}
      </div>
      <PageLink
        href={buildPageHref(path, params, currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next →
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return disabled ? (
    <span
      aria-disabled="true"
      className="rounded-lg border border-white/[0.06] px-4 py-2 text-sm font-medium text-slate-700"
    >
      {children}
    </span>
  ) : (
    <Link
      href={href}
      className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
    >
      {children}
    </Link>
  );
}

function buildPageHref(
  path: string,
  params: Record<string, string | number | undefined>,
  page: number,
): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });
  search.set("page", String(page));
  return `${path}?${search.toString()}`;
}

function pageWindow(currentPage: number, totalPages: number): number[] {
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
