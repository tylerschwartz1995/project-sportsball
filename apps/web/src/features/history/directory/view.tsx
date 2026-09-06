import { Suspense } from "react";
import { withReadContext } from "@/data/read-context";
import { NavigationComplete } from "@/components/shell/navigation-metrics";
import { SiteHeader } from "@/components/shell/site-header";
import { ViewTabs } from "@/components/ui/view-tabs";
import { SeasonPhaseFilter } from "@/features/league/season-phase-filter";
import type { loadHistoryPage } from './loader';
import { historyPhaseParams } from './logic';
import { HistoryErasContent, HistoryHeader, HistoryLeaderboardContent, HistoryOverviewContent, HistoryPeaksContent } from './sections';
export function HistoryPageView({
  phase,
  section,
  sectionTabs,
  params,
}: Awaited<ReturnType<typeof loadHistoryPage>>) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="history" />
      <section className="py-8 sm:py-10">
        <HistoryHeader phase={phase} />
        <div className="workspace-history-primary-navs">
          <ViewTabs
            active={section}
            ariaLabel="History views"
            label="History view"
            tabs={sectionTabs}
          />
          <SeasonPhaseFilter
            active={phase}
            path="/history"
            params={historyPhaseParams(section, params)}
          />
        </div>
        <Suspense fallback={<p role="status" className="workspace-empty-state">Loading history results…</p>}>
          <HistoryContent phase={phase} section={section} params={params} />
        </Suspense>
      </section>
    </main>
  );
}

function HistoryContent({ phase, section, params }: Pick<Awaited<ReturnType<typeof loadHistoryPage>>, "phase" | "section" | "params">) {
  return withReadContext("history/directory", async () => {
    const content = await (section === "overview" ? HistoryOverviewContent({ phase })
      : section === "careers" || section === "seasons" ? HistoryLeaderboardContent({ params, section, phase })
      : section === "peaks" ? HistoryPeaksContent({ params, phase })
      : HistoryErasContent({ params, phase }));
    return <>{content}<NavigationComplete /></>;
  });
}
