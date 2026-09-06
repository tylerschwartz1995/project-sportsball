import { SiteHeader } from "@/components/shell/site-header";
import Link from "@/components/ui/exploration-link";
import {
  WorkspacePageHeader,
  WorkspacePanel,
} from "@/components/ui/workspace-primitives";
import {
  seasonPhaseLabel
} from "@/contracts/season-phase";
import { PlayerDirectComparisonChart } from "@/features/charts/lazy-charts";
import { SeasonPhaseFilter } from "@/features/league/season-phase-filter";
import { SeasonPicker } from "@/features/league/season-picker";
import { PlayerComparisonPicker } from "@/features/players/player-comparison-picker";
import type { loadPlayerComparePage } from './loader';
import { ComparisonTable } from './sections';
export function PlayerComparePageView({
  selectedSeason,
  phase,
  category,
  seasons,
  selectedIds,
  availablePlayers,
  comparisonEntries,
  metrics,
}: Awaited<ReturnType<typeof loadPlayerComparePage>>) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="players" />
      <section className="py-8 sm:py-10">
        <Link
          href={`/players${selectedSeason ? `?season=${selectedSeason.id}&phase=${phase}&type=${category}` : ""}`}
          className="workspace-back-link"
        >
          ← Player Directory
        </Link>
        <div className="mt-5">
          <WorkspacePageHeader
            eyebrow="Players / Comparison"
            title={`${selectedSeason?.label ?? "Season"} Player Comparison`}
            description={`Build a side-by-side ${seasonPhaseLabel(phase).toLowerCase()} comparison using official totals and available advanced metrics.`}
            action={
              <SeasonPicker
                seasons={seasons}
                selectedSeasonId={selectedSeason?.id}
                params={{
                  phase,
                  type: category,
                  players: selectedIds.join(",") || undefined,
                }}
              />
            }
          />
        </div>

        {selectedSeason ? (
          <>
            <SeasonPhaseFilter
              active={phase}
              path="/players/compare"
              params={{
                season: selectedSeason.id,
                type: category,
                players: selectedIds.join(",") || undefined,
              }}
            />
            <nav
              className="workspace-standings-scope"
              aria-label="Player comparison type"
            >
              {(["skaters", "goalies"] as const).map((type) => (
                <Link
                  key={type}
                  href={`/players/compare?season=${selectedSeason.id}&phase=${phase}&type=${type}`}
                  aria-current={category === type ? "page" : undefined}
                >
                  {type === "skaters" ? "Skaters" : "Goalies"}
                </Link>
              ))}
            </nav>

            <div className="mt-6">
              <PlayerComparisonPicker
                key={`${category}:${selectedIds.join(",")}`}
                options={availablePlayers.map((player) => ({
                  nhlPlayerId: player.nhlPlayerId,
                  name: player.name,
                  position: player.position,
                  teamAbbreviations: player.teams.map(
                    (team) => team.abbreviation,
                  ),
                }))}
                initialPlayerIds={selectedIds}
                seasonId={selectedSeason.id}
                phase={phase}
                category={category}
              />
            </div>

            {comparisonEntries.length >= 2 ? (
              <>
                <WorkspacePanel
                  className="mt-7"
                  width="compact"
                  title="Complete Comparison"
                  description="A dash means the metric is unavailable for that player, season, phase, or MoneyPuck coverage."
                >
                  <ComparisonTable
                    players={comparisonEntries}
                    metrics={metrics}
                    seasonId={selectedSeason.id}
                    phase={phase}
                  />
                </WorkspacePanel>
                <details open className="mt-5">
                  <summary>Compare a Metric Visually</summary>{" "}
                  <div className="mt-7">
                    <PlayerDirectComparisonChart
                      players={comparisonEntries}
                      metrics={metrics}
                    />
                  </div>
                </details>
              </>
            ) : null}
          </>
        ) : (
          <div className="workspace-empty-state">
            No player data is available.
          </div>
        )}
      </section>
    </main>
  );
}
