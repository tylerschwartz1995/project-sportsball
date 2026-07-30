import Link from "next/link";

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
    <header className="flex flex-col gap-5 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
      <Link href="/" className="group flex w-fit items-center gap-3">
        <span
          aria-hidden="true"
          className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/[0.08] font-mono text-sm font-semibold text-cyan-200 transition group-hover:border-cyan-300/45"
        >
          SB
        </span>
        <span>
          <span className="block text-lg font-semibold tracking-[-0.025em] text-white">
            Sportsball
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono uppercase tracking-[0.16em] text-cyan-300">
              NHL
            </span>
            Historical data lab
          </span>
        </span>
      </Link>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <nav
          aria-label="Primary navigation"
          className="flex w-fit max-w-full flex-wrap gap-1"
        >
          {links.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              aria-current={active === link.id ? "page" : undefined}
              className={
                active === link.id
                  ? "rounded-lg bg-white/[0.08] px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/10"
                  : "rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-1.5 text-xs font-medium text-emerald-100">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-emerald-300"
          />
          Data current
        </span>
      </div>
    </header>
  );
}
