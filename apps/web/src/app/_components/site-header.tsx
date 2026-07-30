import Link from "next/link";

type SiteHeaderProps = {
  active: "standings" | "games";
};

const links = [
  { id: "standings", href: "/", label: "Standings" },
  { id: "games", href: "/games", label: "Games" },
] as const;

export function SiteHeader({ active }: SiteHeaderProps) {
  return (
    <header className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">
          Sportsball
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
          NHL historical data
        </h1>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <nav
          aria-label="Primary navigation"
          className="flex w-fit rounded-xl border border-white/10 bg-white/[0.035] p-1"
        >
          {links.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              aria-current={active === link.id ? "page" : undefined}
              className={
                active === link.id
                  ? "rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950"
                  : "rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <span className="w-fit rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-emerald-100">
          Historical data online
        </span>
      </div>
    </header>
  );
}
