import Link from "next/link";
import type { ReactNode } from "react";

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
    <>
      <aside className="workspace-sidebar">
        <Brand />
        <PrimaryNavigation active={active} />
        <div className="workspace-sidebar-footer">
          <ThemeToggle />
          <span className="workspace-data-status">
            <span aria-hidden="true" />
            Local dataset
          </span>
        </div>
      </aside>

      <header className="workspace-mobile-header">
        <Brand compact />
        <nav aria-label="Primary navigation" className="workspace-mobile-nav">
          {links.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              aria-current={active === link.id ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle compact />
      </header>
    </>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="workspace-brand">
      <span aria-hidden="true">SB</span>
      {compact ? null : (
        <span>
          <strong>Sportsball</strong>
          <small>NHL statistics &amp; analysis</small>
        </span>
      )}
    </Link>
  );
}

function PrimaryNavigation({ active }: SiteHeaderProps) {
  return (
    <nav aria-label="Primary navigation" className="workspace-primary-nav">
      {navigationGroups.map((group) => (
        <div key={group.label} className="workspace-primary-nav-group">
          <p>{group.label}</p>
          {group.links.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              aria-current={active === link.id ? "page" : undefined}
            >
              <NavigationIcon id={link.id} />
              {link.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

function NavigationIcon({ id }: { id: SiteSection }) {
  const paths: Record<SiteSection, ReactNode> = {
    home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5M9 21v-7h6v7" /></>,
    games: <><circle cx="12" cy="12" r="9" /><path d="M7 7c3 3 7 7 10 10M17 7c-3 3-7 7-10 10" /></>,
    standings: <path d="M5 20V10h4v10M10 20V4h4v16M15 20v-7h4v7" />,
    playoffs: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v4M8 20h8" /></>,
    teams: <><circle cx="8" cy="9" r="3" /><circle cx="17" cy="8" r="2.5" /><path d="M2.5 20a5.5 5.5 0 0 1 11 0M13 15a4.5 4.5 0 0 1 8.5 2" /></>,
    players: <><circle cx="12" cy="7" r="3" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    analytics: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>,
    drafts: <><path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5" /></>,
    history: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24">{paths[id]}</svg>;
}
