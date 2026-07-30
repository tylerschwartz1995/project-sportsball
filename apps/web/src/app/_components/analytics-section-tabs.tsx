export type AnalyticsSection =
  | "teams"
  | "skaters"
  | "goalies"
  | "lines"
  | "guide";

export function AnalyticsSectionTabs({
  seasonId,
  active,
}: {
  seasonId: number;
  active: AnalyticsSection;
}) {
  const tabs: Array<{
    id: AnalyticsSection;
    label: string;
    href: string;
  }> = [
    {
      id: "teams",
      label: "Teams",
      href: `/analytics?season=${seasonId}&type=teams&situation=5on5`,
    },
    {
      id: "skaters",
      label: "Skaters",
      href: `/analytics?season=${seasonId}&type=skaters&situation=5on5&minimum=300`,
    },
    {
      id: "goalies",
      label: "Goalies",
      href: `/analytics?season=${seasonId}&type=goalies&situation=all&minimum=500`,
    },
    {
      id: "lines",
      label: "Lines & pairings",
      href: `/lines?season=${seasonId}&minimum=100`,
    },
    {
      id: "guide",
      label: "Metric guide",
      href: `/analytics/guide?season=${seasonId}`,
    },
  ];

  return (
    <nav
      aria-label="Advanced analytics sections"
      className="mt-10 flex w-fit max-w-full flex-wrap rounded-xl border border-white/10 bg-white/[0.035] p-1"
    >
      {tabs.map((tab) => (
        <a
          key={tab.id}
          href={tab.href}
          aria-current={tab.id === active ? "page" : undefined}
          className={
            tab.id === active
              ? "rounded-lg bg-violet-300 px-4 py-2 text-sm font-semibold text-slate-950"
              : "rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
          }
        >
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
