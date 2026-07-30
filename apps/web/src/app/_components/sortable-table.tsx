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

type SortDirection = "asc" | "desc";

type SortState = {
  key: string;
  direction: SortDirection;
};

type SortableTableContextValue = SortState & {
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
  defaultSortKey = "",
  defaultDirection = "desc",
}: {
  children: ReactNode;
  defaultSortKey?: string;
  defaultDirection?: SortDirection;
}) {
  const [sortState, setSortState] = useState<SortState>({
    key: defaultSortKey,
    direction: defaultDirection,
  });

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
        sortState.key === key
          ? sortState.direction === "asc"
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
    [sortState],
  );

  const contextValue = useMemo(
    () => ({ ...sortState, sort }),
    [sort, sortState],
  );

  return (
    <SortableTableContext.Provider value={contextValue}>
      <div>{children}</div>
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

  const rawValue = cell.dataset.sortValue ?? cell.textContent ?? "";
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
