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
      label: "Team Stats",
      href: `/analytics?season=${seasonId}&type=teams&situation=5on5`,
    },
    {
      id: "skaters",
      label: "Player Stats",
      href: `/analytics?season=${seasonId}&type=skaters&situation=5on5`,
    },
    {
      id: "guide",
      label: "Metric Guide",
      href: `/analytics/guide?season=${seasonId}`,
    },
  ];

  return (
    <nav
      aria-label="Advanced analytics sections"
      className="workspace-scroll-nav workspace-analytics-tabs"
    >
      {tabs.map((tab) => (
        <a
          key={tab.id}
          href={tab.href}
          aria-current={tab.id === active ? "page" : undefined}
        >
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
