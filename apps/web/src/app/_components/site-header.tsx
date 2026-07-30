import Link from "next/link";

import { ThemeToggle } from "@/app/_components/theme-toggle";

type SiteHeaderProps = {
  active:
    | "home"
    | "standings"
    | "games"
    | "teams"
    | "players"
    | "analytics";
};

const links = [
  { id: "home", href: "/", label: "Home" },
  { id: "standings", href: "/standings", label: "Standings" },
  { id: "games", href: "/games", label: "Games" },
  { id: "teams", href: "/teams", label: "Teams" },
  { id: "players", href: "/players", label: "Players" },
  { id: "analytics", href: "/analytics", label: "Analytics" },
] as const;

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
            Data current
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
          <small>NHL data workspace</small>
        </span>
      )}
    </Link>
  );
}

function PrimaryNavigation({ active }: SiteHeaderProps) {
  return (
    <nav aria-label="Primary navigation" className="workspace-primary-nav">
      {links.map((link) => (
        <Link
          key={link.id}
          href={link.href}
          aria-current={active === link.id ? "page" : undefined}
        >
          <span aria-hidden="true">{link.label.slice(0, 1)}</span>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
