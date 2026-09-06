"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useRef } from "react";
import { IntentLink as Link } from "@/components/ui/intent-link";

import { ActiveNavigationScroller } from "@/components/shell/active-navigation-scroller";
import { ThemeToggle } from "@/components/shell/theme-toggle";

export type SiteSection =
  | "home"
  | "standings"
  | "games"
  | "teams"
  | "players"
  | "drafts"
  | "history"
  | "playoffs"
  | "analytics"
  | "search";

type SiteHeaderProps = {
  active?: SiteSection;
};

const navigationGroups = [
  {
    label: "Follow",
    links: [
      { id: "home", href: "/", label: "Home" },
      { id: "games", href: "/games", label: "Games" },
      { id: "standings", href: "/standings", label: "Standings" },
      { id: "playoffs", href: "/playoffs", label: "Playoffs" },
    ],
  },
  {
    label: "Explore",
    links: [
      { id: "teams", href: "/teams", label: "Teams" },
      { id: "players", href: "/players", label: "Players" },
    ],
  },
  {
    label: "Research",
    links: [
      { id: "analytics", href: "/analytics", label: "Analytics" },
      { id: "drafts", href: "/drafts", label: "Drafts" },
      { id: "history", href: "/history", label: "History" },
    ],
  },
] as const;
const links = [
  ...navigationGroups[0].links,
  ...navigationGroups[1].links,
  ...navigationGroups[2].links,
];

export function SiteHeader(props: SiteHeaderProps) {
  return (
    <Suspense fallback={<HeaderContent {...props} />}>
      <SiteNavigation {...props} />
    </Suspense>
  );
}
function SiteNavigation(props: SiteHeaderProps) {
  const search = useSearchParams();
  const pathname = usePathname();
  return <HeaderContent {...props} searchQuery={search.toString()} pathname={pathname} />;
}

function HeaderContent({ active, searchQuery = "", pathname = "" }: SiteHeaderProps & {
  searchQuery?: string;
  pathname?: string;
}) {
  const search = new URLSearchParams(searchQuery);
  const menu = useRef<HTMLDetailsElement>(null);
  function destination(href: string) {
    const params = new URLSearchParams();
    if (
      !["/drafts", "/history", "/search"].includes(href) &&
      search.has("season")
    )
      params.set("season", search.get("season")!);
    if (
      !["/drafts", "/standings", "/playoffs", "/"].includes(href) &&
      search.has("phase")
    )
      params.set("phase", search.get("phase")!);
    return href + (params.size ? `?${params}` : "");
  }
  return (
    <header className="site-header">
      <div className="site-topbar">
        <Link href="/" className="site-brand" aria-label="Sportsball home">
          <svg
            viewBox="0 0 28 28"
            width="28"
            height="28"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 20V13M14 20V5M23 20V9"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
          Sportsball
        </Link>
        <span className="site-sport">NHL</span>
        <div className="site-utilities">
          <Link className="site-search-link" href="/search">
            Find a Player
          </Link>
          <ThemeToggle />
        </div>
      </div>
      <details
        key={pathname}
        ref={menu}
        className="site-mobile-menu"
        onKeyDown={(event) => {
          if (event.key === "Escape" && menu.current) {
            menu.current.open = false;
            menu.current.querySelector("summary")?.focus();
          }
        }}
      >
        <summary>
          Menu ·{" "}
          {links.find((link) => link.id === active)?.label ?? "Find a Player"}
        </summary>
        <nav aria-label="All sections">
          {navigationGroups.map((group) => (
            <div key={group.label}>
              <strong>{group.label}</strong>
              {group.links.map((link) => (
                <Link
                  key={link.id}
                  href={destination(link.href)}
                  aria-current={active === link.id ? "page" : undefined}
                  onClick={() => {
                    if (menu.current) menu.current.open = false;
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
          <Link href="/search">Find a Player · All Seasons</Link>
          <Link href={destination("/lines")}>Lines & Pairings</Link>
        </nav>
      </details>
      <nav aria-label="Primary navigation" className="site-navigation">
        {links.map((link) => (
          <Link
            key={link.id}
            href={destination(link.href)}
            aria-current={active === link.id ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
        <ActiveNavigationScroller active={active} />
      </nav>
    </header>
  );
}
