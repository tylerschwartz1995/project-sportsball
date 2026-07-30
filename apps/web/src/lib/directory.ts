export type PageSlice<T> = {
  items: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  firstItem: number;
  lastItem: number;
};

export function firstQueryValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function normalizeSearch(value: string | undefined): string {
  return value?.trim().slice(0, 100) ?? "";
}

export function parsePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function parseSortDirection(
  value: string | undefined,
  fallback: "asc" | "desc",
): "asc" | "desc" {
  return value === "asc" || value === "desc" ? value : fallback;
}

export function applySortDirection(
  comparison: number,
  direction: "asc" | "desc",
): number {
  return direction === "asc" ? -comparison : comparison;
}

export function paginate<T>(
  items: T[],
  requestedPage: number,
  pageSize: number,
): PageSlice<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return {
    items: pageItems,
    currentPage,
    totalPages,
    totalItems: items.length,
    firstItem: pageItems.length === 0 ? 0 : start + 1,
    lastItem: start + pageItems.length,
  };
}

export function matchesSearch(
  query: string,
  ...values: Array<string | null | undefined>
): boolean {
  if (!query) {
    return true;
  }
  const normalizedQuery = query.toLocaleLowerCase();
  return values.some((value) =>
    value?.toLocaleLowerCase().includes(normalizedQuery),
  );
}
