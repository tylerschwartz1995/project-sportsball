"use client";
import { IntentLink as Link } from "@/components/ui/intent-link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";
import { explorationHref, safeReturnPath } from "@/lib/exploration-context";
export default function ExplorationLink({
  href,
  ...props
}: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const search = useSearchParams();
  return (
    <Link
      {...props}
      href={
        typeof href === "string"
          ? explorationHref(href, pathname, search.toString())
          : href
      }
    />
  );
}
export function ReturnLink({
  fallback,
  children,
}: {
  fallback: string;
  children: React.ReactNode;
}) {
  const search = useSearchParams();
  const back = safeReturnPath(search.get("returnTo"));
  return (
    <Link className="workspace-return-link" href={back ?? fallback}>
      {back ? "← Back to Results" : children}
    </Link>
  );
}
