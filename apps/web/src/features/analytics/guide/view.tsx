import { NavigationComplete } from "@/components/shell/navigation-metrics";
import { SiteHeader } from "@/components/shell/site-header";
import { WorkspacePageHeader } from "@/components/ui/workspace-primitives";
import { AnalyticsSectionTabs } from "@/features/analytics/analytics-section-tabs";
import { metricGroups } from './logic';

import type { loadMetricGuidePage } from './loader';
export function MetricGuidePageView({
  selectedSeason,
}: Awaited<ReturnType<typeof loadMetricGuidePage>>) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="analytics" />

      <section className="py-10">
        <WorkspacePageHeader
          eyebrow="Advanced analytics reference"
          title="Metric Guide"
          description="Plain-language definitions for the advanced statistics used across team, player, line, goalie, and game views."

        />

        {selectedSeason ? (
          <AnalyticsSectionTabs
            seasonId={selectedSeason.id}
            active="guide"
          />
        ) : null}

        <div className="workspace-guide-groups">
          {metricGroups.map((group) => (
            <section key={group.title} className="workspace-guide-group">
              <header>
                <h2>{group.title}</h2>
                <p>
                  {group.description}
                </p>
              </header>
              <div className="workspace-guide-grid">
                {group.metrics.map((metric) => (
                  <article
                    key={metric.abbreviation}
                    className="workspace-guide-card"
                  >
                    <div>
                      <h3>
                        {metric.abbreviation}
                      </h3>
                      <strong>
                        {metric.name}
                      </strong>
                    </div>
                    <p>
                      {metric.definition}
                    </p>
                    <p className="workspace-guide-reading">
                      {metric.reading}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="workspace-guide-note">
          <h2>How to Read the Data</h2>
          <p>
            Situation filters matter: all-situations results include power
            plays and penalty kills, while 5-on-5 is better for even-strength
            comparison. Small samples can swing sharply, and model-based
            metrics should support—not replace—game context.
          </p>
          <div>
            <a
              href="https://www.moneypuck.com/glossary.htm"
              target="_blank"
              rel="noreferrer"
            >
              MoneyPuck glossary ↗
            </a>
            <a
              href="https://www.moneypuck.com/about.htm"
              target="_blank"
              rel="noreferrer"
            >
              Model methodology ↗
            </a>
          </div>
        </aside>
      </section>
    <NavigationComplete />
    </main>
  );
}
