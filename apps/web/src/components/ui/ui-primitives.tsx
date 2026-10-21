import type { ReactNode } from "react";

export function DataTableShell({ children }: { children: ReactNode }) {
  return <div className="data-table-shell mt-5">{children}</div>;
}
