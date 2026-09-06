import { NavigationComplete } from "@/components/shell/navigation-metrics";
import { SiteHeader } from "@/components/shell/site-header";
import Link from "@/components/ui/exploration-link";
import { ViewTabs } from "@/components/ui/view-tabs";
import {
  WorkspacePageHeader
} from "@/components/ui/workspace-primitives";
import { StandingsPointsChart } from "@/features/charts/lazy-charts";
import { SeasonPicker } from "@/features/league/season-picker";
import type { loadStandingsPage } from './loader';
import { capitalize, formatSnapshotDate, sortStandings } from './logic';
import { StandingsTable } from './sections';
export function StandingsPageView({
  pointsHistory,
  standings,
  selectedSeason,
  seasons,
  leader,
  display,
  chartDivision,
  view,
  activeSort,
  direction,
  groups,
}: Awaited<ReturnType<typeof loadStandingsPage>>) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="standings" />

      <section className="py-8 sm:py-10">
        <WorkspacePageHeader
          eyebrow="League / Standings"
          title={
            selectedSeason
              ? `${selectedSeason.label} Standings`
              : "No Standings Available"
          }
          description="Official NHL regular-season rankings with overall, conference, and division views."
          action={
            <SeasonPicker
              seasons={seasons}
              selectedSeasonId={selectedSeason?.id}
              params={{ view, display, chartDivision }}
            />
          }
        />

        {leader && selectedSeason ? (
          <>
            {display === "standings" ? <div className="workspace-width-standard">
              <nav
                className="workspace-standings-scope"
                aria-label="Standings grouping"
              >
                <span className="workspace-navigation-label" aria-hidden="true">Group by</span>
                {(["overall", "conference", "division"] as const).map(
                  (option) => (
                    <Link
                      key={option}
                      href={`/standings?season=${selectedSeason.id}&view=${option}&display=${display}${chartDivision ? `&chartDivision=${encodeURIComponent(chartDivision)}` : ""}`}
                      aria-current={view === option ? "page" : undefined}
                    >
                      {capitalize(option)}
                    </Link>
                  ),
                )}
              </nav>
            </div> : null}

            <ViewTabs
              active={display}
              ariaLabel="Standings content views"
              label="Content"
              width="standard"
              tabs={[
                {
                  id: "standings",
                  label: "Standings",
                  href: `/standings?season=${selectedSeason.id}&view=${view}&display=standings&sort=${activeSort}&dir=${direction}`,
                },
                {
                  id: "progress",
                  label: "Points Progression",
                  href: `/standings?season=${selectedSeason.id}&view=${view}&display=progress${chartDivision ? `&chartDivision=${encodeURIComponent(chartDivision)}` : ""}`,
                },
              ]}
            />

            {display === "standings" ? (
              <div className="mt-7 grid gap-7">
                {groups.map((group) => (
                  <StandingsTable
                    key={group.label}
                    label={group.label}
                    standings={sortStandings(
                      group.standings,
                      activeSort,
                      direction,
                      view,
                    )}
                    defaultSortKey={activeSort}
                    defaultDirection={direction}
                    view={view}
                    seasonId={selectedSeason.id}
                  />
                ))}
                <div className="workspace-table-note">
                  Snapshot: {formatSnapshotDate(leader.snapshotDate)} · Source: NHL · p Presidents’ Trophy · z
                  conference · y division · x playoff berth · e eliminated
                </div>
              </div>
            ) : null}

            {display === "progress" ? (
              <div className="mt-7">
                <StandingsPointsChart
                  history={pointsHistory}
                  standings={standings}
                />
              </div>
            ) : null}
          </>
        ) : (
          <div className="workspace-empty-state">
            No standings are available for this season.
          </div>
        )}
      </section>
    <NavigationComplete />
    </main>
  );
}
