import type { ReactNode } from "react";
import { TableScroll } from "@/components/ui/table-scroll";

export function ComparisonScrollRegion({ children }: { children: ReactNode }) {
  return <TableScroll className="workspace-table-scroll modern-comparison-scroll" aria-label="Player comparison table">{children}</TableScroll>;
}
