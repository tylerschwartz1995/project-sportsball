import Link from "next/link";

import { ActiveNavigationScroller } from "@/app/_components/active-navigation-scroller";
import { ThemeToggle } from "@/app/_components/theme-toggle";

export type SiteSection =
  | "home"
  | "standings"
  | "games"
  | "teams"
  | "players"
  | "drafts"
  | "history"
  | "playoffs"
  | "analytics";

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

export function SiteHeader({ active }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="site-topbar">
        <Link href="/" className="site-brand" aria-label="Sportsball home">
          <svg viewBox="0 0 28 28" width="28" height="28" fill="none" aria-hidden="true">
            <path d="M5 20V13M14 20V5M23 20V9" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          </svg>
          Sportsball
        </Link>
        <span className="site-sport">NHL</span>
        <div className="site-utilities"><ThemeToggle /></div>
      </div>
      <nav aria-label="Primary navigation" className="site-navigation">
        {links.map((link) => (
          <Link
            key={link.id}
            href={link.href}
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
