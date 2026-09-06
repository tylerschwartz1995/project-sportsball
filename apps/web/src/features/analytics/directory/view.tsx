import { NavigationComplete } from "@/components/shell/navigation-metrics";
import { SiteHeader } from "@/components/shell/site-header";
import {
  WorkspacePageHeader,
} from "@/components/ui/workspace-primitives";
import {
  seasonPhaseLabel
} from "@/contracts/season-phase";
import { AnalyticsSectionTabs } from "@/features/analytics/analytics-section-tabs";
import { PlayerComparisonPlots, TeamComparisonScatterplot } from "@/features/charts/lazy-charts";
import { DataViews } from "@/features/league/data-views";
import { SeasonPhaseFilter } from "@/features/league/season-phase-filter";
import { SeasonPicker } from "@/features/league/season-picker";
import { PagedLeaderboard as LeaderboardTable } from "./paged-leaderboard";
import type { loadAnalyticsPage } from './loader';
import { AnalyticsFilters, AnalyticsGuide, CoverageNotice } from './sections';
export function AnalyticsPageView({
  rows,
  selectedSeason,
  type,
  phase,
  seasons,
  minimumMinutes,
  chartParams,
  hasCoverage,
  situation,
  comparisonPoints,
  skaterComparisonPoints,
  goalieComparisonPoints,
}: Awaited<ReturnType<typeof loadAnalyticsPage>>) {
  return (
    <main className="modern-analytics mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="analytics" />

      <section className="py-10">
        <WorkspacePageHeader
          eyebrow="MoneyPuck leaderboards"
          title={`${selectedSeason?.label ?? "No Season"} Advanced Analytics`}
          description={
            type === "teams"
              ? `${seasonPhaseLabel(phase)} shot quality and possession.`
              : type === "goalies"
                ? "Regular-season goaltending, split by team."
                : "Regular-season shot creation and on-ice results, split by team."
          }
          action={
            <SeasonPicker
              seasons={seasons}
              selectedSeasonId={selectedSeason?.id}
              params={{
                type,
                situation,
                minimum: type === "teams" ? undefined : minimumMinutes,
                phase,
                ...chartParams,
              }}
            />
          }
        />

        {selectedSeason ? (
          <>
            <div className="workspace-context-navs">
              <AnalyticsSectionTabs
                seasonId={selectedSeason.id}
                active={type}
              />

              {type === "teams" ? (
                <SeasonPhaseFilter
                  active={phase}
                  path="/analytics"
                  params={{
                    season: selectedSeason.id,
                    type,
                    situation,
                    ...chartParams,
                  }}
                />
              ) : null}
            </div>

            {hasCoverage ? (
              <>
                <DataViews
                  table={
                    <>
                      {" "}
                      <AnalyticsFilters
                        seasonId={selectedSeason.id}
                        type={type}
                        situation={situation}
                        minimumMinutes={minimumMinutes}
                        phase={phase}
                        chartParams={chartParams}
                      />
                      <LeaderboardTable
                        type={type}
                        rows={rows}
                        seasonId={selectedSeason.id}
                        phase={phase}
                      />
                    </>
                  }
                  charts={
                    <>
                      {type !== "teams" ? (
                        <AnalyticsFilters
                          seasonId={selectedSeason.id}
                          type={type}
                          situation={situation}
                          minimumMinutes={minimumMinutes}
                          phase={phase}
                          chartParams={chartParams}
                        />
                      ) : null}{" "}
                      <p className="mt-4 text-sm text-[var(--muted)]">
                        {type === "teams"
                          ? "Five-on-Five Team Comparison · All teams stay visible. Choose a process metric below."
                          : `Up to 200 qualifying player-team rows, selected by ${type === "skaters" ? "Game Score" : "GSAx"}. Filters and comparisons operate within this sample.`}
                      </p>{" "}
                      {type === "teams" ? (
                        <TeamComparisonScatterplot
                          points={comparisonPoints}
                          phase={phase}
                        />
                      ) : null}
                      {type === "skaters" ? (
                        <PlayerComparisonPlots
                          kind="skater"
                          points={skaterComparisonPoints}
                        />
                      ) : null}
                      {type === "goalies" ? (
                        <PlayerComparisonPlots
                          kind="goalie"
                          points={goalieComparisonPoints}
                        />
                      ) : null}
                    </>
                  }
                />
                <AnalyticsGuide seasonId={selectedSeason.id} />
              </>
            ) : (
              <CoverageNotice />
            )}
          </>
        ) : (
          <CoverageNotice />
        )}
      </section>
    <NavigationComplete />
    </main>
  );
}
