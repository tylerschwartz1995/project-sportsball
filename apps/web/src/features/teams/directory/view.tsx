import { NavigationComplete } from "@/components/shell/navigation-metrics";
import { SiteHeader } from "@/components/shell/site-header";
import { WorkspacePageHeader } from "@/components/ui/workspace-primitives";
import { StatsTabs } from "@/components/ui/stats-tabs";
import { SeasonPicker } from "@/features/league/season-picker";
import { SeasonPhaseFilter } from "@/features/league/season-phase-filter";
import { TeamStatsTable } from "@/features/teams/team-stats-table";
import type { loadTeamsPage } from './loader';
export function TeamsPageView({ selectedSeason, seasons, sortedTeams, phase }: Awaited<ReturnType<typeof loadTeamsPage>>) {
  return <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
    <SiteHeader active="teams" /><section className="py-8 sm:py-10">
      <WorkspacePageHeader eyebrow="" title="Team Stats" description="Season results. Select a team for its stats, players, and games." action={<SeasonPicker seasons={seasons} selectedSeasonId={selectedSeason?.id} params={{ phase }} />} />
      {selectedSeason ? <>
        <StatsTabs subject="teams" seasonId={selectedSeason.id} phase={phase} />
        <SeasonPhaseFilter active={phase} path="/teams" params={{ season: selectedSeason.id }} />
        {sortedTeams.length ? <TeamStatsTable rows={sortedTeams} seasonId={selectedSeason.id} phase={phase} /> : <p className="workspace-empty-state">No team stats are available for this season and phase.</p>}
        <p className="workspace-table-note">Source: NHL game results. Regular-season losses exclude overtime and shootout losses.</p>
      </> : <p className="workspace-empty-state">No team stats are available.</p>}
    </section><NavigationComplete />
  </main>;
}
