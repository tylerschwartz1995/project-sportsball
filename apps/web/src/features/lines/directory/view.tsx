import { SiteHeader } from "@/components/shell/site-header";
import Link from "@/components/ui/exploration-link";
import { ResultNavigation } from "@/components/ui/result-navigation";
import {
  WorkspacePageHeader,
} from "@/components/ui/workspace-primitives";
import { AnalyticsSectionTabs } from "@/features/analytics/analytics-section-tabs";
import { SeasonPicker } from "@/features/league/season-picker";
import { SeasonUnitTables } from "@/features/lines/season-unit-tables";
import type { loadLinesPage } from './loader';
import { unitViewHref } from './logic';
import { CombinationFilters } from './sections';
export function LinesPageView({
  teams,
  units,
  selectedSeason,
  seasons,
  minimumMinutes,
  selectedTeam,
  rollingGames,
  pageSize,
  view,
  sort,
  direction,
  navigationParams,
  unitPage,
}: Awaited<ReturnType<typeof loadLinesPage>>) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="analytics" />

      <section className="py-10">
        <WorkspacePageHeader
          eyebrow="MoneyPuck five-on-five units"
          title={`${selectedSeason?.label ?? "No Season"} Top Combinations`}
          description="Compare five-on-five forward lines and defensive pairings. Rates are recalculated from available game totals."
          action={
            <SeasonPicker
              seasons={seasons}
              selectedSeasonId={selectedSeason?.id}
              params={{
                minimum: minimumMinutes,
                team: selectedTeam?.nhlTeamId,
                window: rollingGames,
                view,
                perPage: pageSize,
                sort,
                direction,
              }}
            />
          }
        />

        {selectedSeason ? (
          <AnalyticsSectionTabs seasonId={selectedSeason.id} active="lines" />
        ) : null}

        {selectedSeason && selectedSeason.id >= 20082009 ? (
          <>
            <div className="modern-combination-controls mt-5">
              <CombinationFilters
                seasonId={selectedSeason.id}
                selectedMinutes={minimumMinutes}
                teams={teams.map(({ team }) => team)}
                selectedTeamId={selectedTeam?.nhlTeamId}
                rollingGames={rollingGames}
                view={view}
                pageSize={pageSize}
                sort={sort}
                direction={direction}
              />
              <details className="modern-scope-help"><summary>How sample windows work</summary><p>Compare full-season results or each team’s most recent 10, 20, or 40 regular-season games. Rolling windows use the last team games in the selected season and recompute every rate from the supporting totals.</p></details>
            </div>
            <div className="mt-5">
              <nav className="workspace-subview-tabs" aria-label="Combination type">
                <Link href={unitViewHref(navigationParams, "lines")} aria-current={view === "lines" ? "page" : undefined}>
                  Forward Lines <span>{units.forwardLines.length}</span>
                </Link>
                <Link href={unitViewHref(navigationParams, "pairings")} aria-current={view === "pairings" ? "page" : undefined}>
                  Defensive Pairings <span>{units.defensivePairings.length}</span>
                </Link>
              </nav>
              <div id="combination-results"><p className="mt-4 text-sm text-[var(--muted)]">Up to 100 qualifying units per type, selected by xG%. Sorting applies within that sample.</p>
                <SeasonUnitTables
                  data={{
                    forwardLines: view === "lines" ? unitPage.items : [],
                    defensivePairings: view === "pairings" ? unitPage.items : [],
                  }}
                  seasonId={selectedSeason.id}
                  only={view === "lines" ? "line" : "pairing"}
                  urlSort={{ key: sort, direction, scrollTarget: "combination-results" }}
                />
                <ResultNavigation
                  path="/lines"
                  params={navigationParams}
                  currentPage={unitPage.currentPage}
                  totalPages={unitPage.totalPages}
                  firstItem={unitPage.firstItem}
                  lastItem={unitPage.lastItem}
                  totalItems={unitPage.totalItems}
                  pageSize={pageSize}
                  scrollTarget="combination-results"
                />
              </div>
            </div>
            <p className="workspace-coverage-note mt-8">
              <strong>Coverage:</strong> Regular-season five-on-five data from{" "}
              <a
                href="https://moneypuck.com/"
                target="_blank"
                rel="noreferrer"
              >
                MoneyPuck.com
              </a>
              . Coverage begins in 2008–09.
            </p>
          </>
        ) : (
          <div className="workspace-empty-state mt-10">
            <strong>Combinations are unavailable for this season.</strong>
            <span>MoneyPuck line and pairing coverage begins in 2008–09.</span>
          </div>
        )}
      </section>
    </main>
  );
}
