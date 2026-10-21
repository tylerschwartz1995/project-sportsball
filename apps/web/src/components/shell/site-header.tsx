"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { IntentLink as Link } from "@/components/ui/intent-link";

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

const links = [
  { id: "standings", href: "/standings", label: "Standings" },
  { id: "teams", href: "/teams", label: "Teams" },
  { id: "players", href: "/players", label: "Players" },
  { id: "games", href: "/games", label: "Games" },
] as const;

export function SiteHeader(props: SiteHeaderProps) {
  return (
    <Suspense fallback={<HeaderContent {...props} />}>
      <SiteNavigation {...props} />
    </Suspense>
  );
}
function SiteNavigation(props: SiteHeaderProps) {
  const search = useSearchParams();
  return <HeaderContent {...props} searchQuery={search.toString()} />;
}

function HeaderContent({ active, searchQuery = "" }: SiteHeaderProps & {
  searchQuery?: string;
}) {
  const search = new URLSearchParams(searchQuery);
  function destination(href: string) {
    const params = new URLSearchParams();
    if (search.has("season")) params.set("season", search.get("season")!);
    if (search.has("phase")) params.set("phase", search.get("phase")!);
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
      </div>
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
      </nav>
      <div className="site-utilities"><ThemeToggle compact /></div>
    </header>
  );
}
