import Link from "next/link";

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
}: {
  active: T;
  ariaLabel: string;
  tabs: ViewTab<T>[];
  secondary?: boolean;
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className={`workspace-scroll-nav${secondary ? " is-secondary" : ""}`}
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
