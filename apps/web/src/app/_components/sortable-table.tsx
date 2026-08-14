"use client";

import {
  createContext,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

type SortDirection = "asc" | "desc";

type SortState = {
  key: string;
  direction: SortDirection;
};

type SortableTableContextValue = SortState & {
  sortHref: (
    key: string,
    defaultDirection: SortDirection,
  ) => string | null;
  sort: (
    event: MouseEvent<HTMLButtonElement>,
    key: string,
    defaultDirection: SortDirection,
  ) => void;
};

const SortableTableContext = createContext<SortableTableContextValue | null>(
  null,
);

export function SortableTable({
  children,
  className,
  defaultSortKey = "",
  defaultDirection = "desc",
  urlBacked = false,
  scrollTarget,
}: {
  children: ReactNode;
  className?: string;
  defaultSortKey?: string;
  defaultDirection?: SortDirection;
  urlBacked?: boolean;
  scrollTarget?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sortState, setSortState] = useState<SortState>({
    key: defaultSortKey,
    direction: defaultDirection,
  });
  const activeKey = urlBacked ? defaultSortKey : sortState.key;
  const activeDirection = urlBacked ? defaultDirection : sortState.direction;

  const sort = useCallback(
    (
      event: MouseEvent<HTMLButtonElement>,
      key: string,
      columnDefaultDirection: SortDirection,
    ) => {
      const table = event.currentTarget.closest("table");
      const header = event.currentTarget.closest("th");
      const body = table?.tBodies.item(0);

      if (!table || !header || !body) {
        return;
      }

      const nextDirection =
        activeKey === key
          ? activeDirection === "asc"
            ? "desc"
            : "asc"
          : columnDefaultDirection;

      const columnIndex = header.cellIndex;
      const rows = Array.from(body.rows);

      rows
        .map((row, originalIndex) => ({
          row,
          originalIndex,
          value: sortableValue(row.cells.item(columnIndex)),
        }))
        .sort((left, right) => {
          if (left.value === null) {
            return right.value === null ? 0 : 1;
          }
          if (right.value === null) {
            return -1;
          }

          const comparison = compareValues(left.value, right.value);
          return (
            (nextDirection === "asc" ? comparison : -comparison) ||
            left.originalIndex - right.originalIndex
          );
        })
        .forEach(({ row }) => body.appendChild(row));

      setSortState({ key, direction: nextDirection });
    },
    [activeDirection, activeKey],
  );

  const sortHref = useCallback(
    (key: string, columnDefaultDirection: SortDirection) => {
      if (!urlBacked) return null;
      const nextDirection =
        activeKey === key
          ? activeDirection === "asc"
            ? "desc"
            : "asc"
          : columnDefaultDirection;
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("sort", key);
      nextParams.set("direction", nextDirection);
      nextParams.delete("page");
      return `${pathname}?${nextParams.toString()}${scrollTarget ? `#${encodeURIComponent(scrollTarget)}` : ""}`;
    }, [
      activeDirection,
      activeKey,
      pathname,
      searchParams,
      scrollTarget,
      urlBacked,
    ],
  );

  const contextValue = useMemo(
    () => ({ key: activeKey, direction: activeDirection, sort, sortHref }),
    [activeDirection, activeKey, sort, sortHref],
  );

  return (
    <SortableTableContext.Provider value={contextValue}>
      <div className={className} data-sort-key={activeKey}>
        {children}
      </div>
    </SortableTableContext.Provider>
  );
}

export function useSortableTable() {
  const context = useContext(SortableTableContext);

  if (!context) {
    throw new Error("SortableHeader must be rendered inside SortableTable.");
  }

  return context;
}

type SortableValue = number | string | null;

function sortableValue(cell: HTMLTableCellElement | null): SortableValue {
  if (!cell) {
    return null;
  }

  const sortVariant = cell.closest<HTMLElement>("[data-sort-variant]")?.dataset
    .sortVariant;
  const variantValue = sortVariant
    ? cell.getAttribute(`data-sort-${sortVariant}`)
    : null;
  const rawValue = variantValue ?? cell.dataset.sortValue ?? cell.textContent ?? "";
  const normalized = rawValue.trim();

  if (!normalized || normalized === "—" || normalized === "-") {
    return null;
  }

  const numericCandidate = normalized
    .replaceAll(",", "")
    .replaceAll("%", "")
    .replace(/^\+/, "");

  const timeMatch = numericCandidate.match(/^(\d+):(\d{2})$/);
  if (timeMatch) {
    return Number(timeMatch[1]) * 60 + Number(timeMatch[2]);
  }

  const ratioMatch = numericCandidate.match(/^(-?\d+(?:\.\d+)?)\//);
  if (ratioMatch) {
    return Number(ratioMatch[1]);
  }

  if (/^-?\d+(?:\.\d+)?$/.test(numericCandidate)) {
    return Number(numericCandidate);
  }

  return normalized.toLocaleLowerCase();
}

function compareValues(left: SortableValue, right: SortableValue): number {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}
