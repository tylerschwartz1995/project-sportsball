import { NavigationComplete } from "@/components/shell/navigation-metrics";
import { SiteHeader } from "@/components/shell/site-header";
import {
  WorkspacePageHeader,
} from "@/components/ui/workspace-primitives";
import { StatsTabs } from "@/components/ui/stats-tabs";
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
  query,
  position,
  hasCoverage,
  situation,
}: Awaited<ReturnType<typeof loadAnalyticsPage>>) {
  return (
    <main className="modern-analytics mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active={type === "teams" ? "teams" : "players"} />

      <section className="py-10">
        <WorkspacePageHeader
          eyebrow=""
          title={type === "teams" ? "Team Stats" : "Player Stats"}
          description=""
          action={
            <SeasonPicker
              seasons={seasons}
              selectedSeasonId={selectedSeason?.id}
              params={{
                type,
                q: query || undefined,
                position: position || undefined,
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
              <StatsTabs subject={type === "teams" ? "teams" : "players"} advanced seasonId={selectedSeason.id} phase={phase} type={type === "goalies" ? "goalies" : "skaters"} />

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
                <AnalyticsFilters seasonId={selectedSeason.id} type={type} situation={situation} minimumMinutes={minimumMinutes} phase={phase} query={query} position={position} chartParams={{}} />
                <LeaderboardTable type={type} rows={rows} seasonId={selectedSeason.id} phase={phase} />
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
