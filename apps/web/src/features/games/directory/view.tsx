import { NavigationComplete } from "@/components/shell/navigation-metrics";
import { SiteHeader } from "@/components/shell/site-header";
import { WorkspacePageHeader } from "@/components/ui/workspace-primitives";
import { GamePicker } from "@/features/games/game-picker";
import { SeasonPicker } from "@/features/league/season-picker";
import type { loadGamesPage } from './loader';
import { formatDate } from './logic';
import { GameCard } from './sections';
export function GamesPageView({
  selectedSeason,
  selectedDate,
  gameDates,
  seasons,
  visibleGames,
}: Awaited<ReturnType<typeof loadGamesPage>>) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="games" />

      <section className="py-10">
        <WorkspacePageHeader
          eyebrow="Schedule and results"
          title={
            selectedSeason
              ? `${selectedSeason.label} NHL Schedule`
              : "No Schedule Available"
          }
          description=""
        />

        {selectedSeason && selectedDate && gameDates.length > 0 ? (
          <>
            <GamePicker
              key={selectedSeason.id}
              seasons={seasons}
              selectedSeasonId={selectedSeason.id}
              gameDates={gameDates}
              selectedDate={selectedDate}
            />

            <div className="workspace-schedule-results-heading">
              <div>
                <h2>{formatDate(selectedDate)}</h2>
              </div>
              <span>
                {visibleGames.length} {visibleGames.length === 1 ? "game" : "games"}
                {" · "}Times shown in your local timezone
              </span>
            </div>

            {visibleGames.length > 0 ? (
              <div className="workspace-game-grid">
                {visibleGames.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            ) : (
              <div className="workspace-empty-state mt-8">
                <strong>
                  No NHL games are scheduled on this date.
                </strong>
                <span>
                  Choose another day from the week or open the calendar to jump
                  elsewhere in the season.
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <SeasonPicker seasons={seasons} selectedSeasonId={selectedSeason?.id} params={{}} />
            <div className="workspace-empty-state mt-10">
              <strong>No schedule is available.</strong>
              <span>The selected season does not have any available game dates.</span>
            </div>
          </>
        )}
      </section>
    <NavigationComplete />
    </main>
  );
}
