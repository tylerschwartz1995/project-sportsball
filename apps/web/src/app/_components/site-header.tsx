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
    <header className={`record-header ${active === "home" ? "record-header-front" : "record-header-section"}`}>
      <div className="record-masthead">
        <p className="record-edition">The Hockey Edition<span>Statistics / Analysis / History</span></p>
        <Link href="/" className="record-brand" aria-label="Sportsball home">
          Sportsball<span aria-hidden="true">.</span>
        </Link>
        <div className="record-utilities">
          <span className="record-dataset">The Game, in Numbers</span>
          <ThemeToggle />
        </div>
      </div>
      <nav aria-label="Primary navigation" className="record-navigation">
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
