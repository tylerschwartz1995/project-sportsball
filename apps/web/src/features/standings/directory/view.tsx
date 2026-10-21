import { NavigationComplete } from "@/components/shell/navigation-metrics";
import { SiteHeader } from "@/components/shell/site-header";
import { FilterForm } from "@/components/ui/filter-form";
import { ViewTabs } from "@/components/ui/view-tabs";
import { SeasonPicker } from "@/features/league/season-picker";
import type { loadStandingsPage } from "./loader";
import { formatSnapshotDate, sortStandings } from "./logic";
import { StandingsTable } from "./sections";

export function StandingsPageView({
  selectedSeason, seasons, leader, view, activeSort, direction, groups, selectedGroup,
}: Awaited<ReturnType<typeof loadStandingsPage>>) {
  return <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
    <SiteHeader active="standings" />
    <section className="py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><h1 className="text-3xl font-semibold">Standings</h1>
        <SeasonPicker seasons={seasons} selectedSeasonId={selectedSeason?.id} params={{ view, group: view === "overall" ? undefined : selectedGroup?.label }} />
      </div>
      {selectedSeason && leader ? <>
        <ViewTabs active={view} ariaLabel="Standings grouping" tabs={[
          { id: "overall", label: "League", href: `/standings?season=${selectedSeason.id}&view=overall` },
          { id: "conference", label: "Conference", href: `/standings?season=${selectedSeason.id}&view=conference` },
          { id: "division", label: "Division", href: `/standings?season=${selectedSeason.id}&view=division` },
        ]} />
        {view !== "overall" && selectedGroup ? (
          <FilterForm action="/standings" autoApply className="workspace-season-picker mt-6 mb-6">
            <input type="hidden" name="season" value={selectedSeason.id} />
            <input type="hidden" name="view" value={view} />
            <input type="hidden" name="sort" value={activeSort} />
            <input type="hidden" name="dir" value={direction} />
            <label>
              {view === "conference" ? "Conference" : "Division"}
              <select key={`${view}-${selectedGroup.label}`} name="group" defaultValue={selectedGroup.label}>
                {groups.map(group => <option key={group.label} value={group.label}>{group.label.replace(/ (Conference|Division)$/, "")}</option>)}
              </select>
            </label>
            <noscript><button type="submit">Apply</button></noscript>
          </FilterForm>
        ) : null}
        <div className="mt-6">
          {selectedGroup ? <StandingsTable key={selectedGroup.label} label={selectedGroup.label}
            standings={sortStandings(selectedGroup.standings, activeSort, direction, view)}
            defaultSortKey={activeSort} defaultDirection={direction}
            view={view} seasonId={selectedSeason.id} /> : null}
        </div>
        <p className="mt-4 text-sm text-[var(--muted)]">Regular season · As of {formatSnapshotDate(leader.snapshotDate)}</p>
      </> : <p className="workspace-empty-state">No standings are available for this season.</p>}
    </section>
    <NavigationComplete />
  </main>;
}
