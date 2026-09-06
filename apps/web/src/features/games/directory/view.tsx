import { SiteHeader } from "@/components/shell/site-header";
import { WorkspacePageHeader } from "@/components/ui/workspace-primitives";
import { GamePicker } from "@/features/games/game-picker";
import { SeasonPhaseFilter } from "@/features/league/season-phase-filter";
import { SeasonPicker } from "@/features/league/season-picker";
import type { loadGamesPage } from './loader';
import { formatDate } from './logic';
import { GameCard } from './sections';
export function GamesPageView({
  scheduleTeams,
  selectedSeason,
  selectedDate,
  gameDates,
  phase,
  selectedTeam,
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
              key={`${selectedSeason.id}:${phase}:${selectedTeam?.nhlTeamId ?? "all"}`}
              seasons={seasons}
              selectedSeasonId={selectedSeason.id}
              gameDates={gameDates}
              selectedDate={selectedDate}
              phase={phase}
              teams={scheduleTeams}
              selectedTeamId={selectedTeam?.nhlTeamId}
            />

            <div className="workspace-schedule-results-heading">
              <div>
                <p>
                  {selectedTeam
                    ? `${selectedTeam.name} Schedule`
                    : "League Schedule"}
                </p>
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
                  {selectedTeam
                    ? `${selectedTeam.name} does not play on this date.`
                    : "No NHL games are scheduled on this date."}
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
            <SeasonPicker seasons={seasons} selectedSeasonId={selectedSeason?.id} params={{ phase }} />
            <SeasonPhaseFilter active={phase} path="/games" params={{ season: selectedSeason?.id }} />
            <div className="workspace-empty-state mt-10">
              <strong>No schedule is available.</strong>
              <span>The selected season and phase do not have any available game dates.</span>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
