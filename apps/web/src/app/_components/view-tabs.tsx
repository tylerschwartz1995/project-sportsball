import Link from "next/link";

import type { WorkspaceWidth } from "@/app/_components/workspace-primitives";

export type ViewTab<T extends string = string> = {
  id: T;
  label: string;
  href: string;
};

export function ViewTabs<T extends string>({
  active,
  ariaLabel,
  tabs,
  secondary = false,
  width = "wide",
}: {
  active: T;
  ariaLabel: string;
  tabs: ViewTab<T>[];
  secondary?: boolean;
  width?: WorkspaceWidth;
}) {
  const widthClass =
    width === "wide" ? "" : ` workspace-width-${width}`;

  return (
    <nav
      aria-label={ariaLabel}
      className={`workspace-scroll-nav${secondary ? " is-secondary" : ""}${widthClass}`}
    >
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={active === tab.id ? "page" : undefined}
          prefetch={false}
          scroll={false}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
