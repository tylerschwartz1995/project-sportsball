"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";
import { explorationHref } from "@/lib/exploration-context";
import { preservePresentation } from "@/lib/filter-context";

/** Read current chart choices rather than a server-rendered snapshot of them. */
export function ContextLink({
  href,
  preserveDisplay = false,
  ...props
}: ComponentProps<typeof Link> & { preserveDisplay?: boolean }) {
  const pathname = usePathname();
  const search = useSearchParams();
  let resolved = href;
  if (typeof href === "string" && href.startsWith("/")) {
    const target = new URL(href, "http://local");
    if (target.pathname === pathname) {
      const display = target.searchParams.get("display");
      preservePresentation(
        target.searchParams,
        new URLSearchParams(search.toString()),
      );
      // A display tab explicitly chooses its destination; resets keep the current display.
      if (!preserveDisplay) {
        if (display === null) target.searchParams.delete("display");
        else target.searchParams.set("display", display);
      }
      resolved = `${target.pathname}${target.search}${target.hash}`;
    }
  }
  return (
    <Link
      {...props}
      href={
        typeof resolved === "string"
          ? explorationHref(resolved, pathname, search.toString())
          : resolved
      }
    />
  );
}
