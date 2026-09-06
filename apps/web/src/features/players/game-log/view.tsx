import { SiteHeader } from "@/components/shell/site-header";
import Link from "@/components/ui/exploration-link";
import {
  seasonPhaseLabel
} from "@/contracts/season-phase";
import { SeasonPhaseFilter } from "@/features/league/season-phase-filter";
import { SeasonPicker } from "@/features/league/season-picker";
import { formatPlayerPosition } from "@/lib/player-position";
import type { loadPlayerGamesPage } from './loader';
import { GoalieGameTable, GoalieRecentForm, SkaterGameTable, SkaterRecentForm } from './sections';
export function PlayerGamesPageView({
  log,
  selectedSeason,
  phase,
  availableSeasons,
  pageSize,
  isGoalie,
  goalieGames,
  skaterGames,
  skaterPage,
  skaterSort,
  direction,
  goaliePage,
  goalieSort,
}: Awaited<ReturnType<typeof loadPlayerGamesPage>>) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="players" />

      <section className="py-10">
        <Link
          href={`/players/${log.profile.nhlPlayerId}?season=${selectedSeason.id}&phase=${phase}`}
          className="text-sm font-medium text-[var(--accent)] transition hover:text-[var(--foreground)]"
        >
          ← {log.profile.name}
        </Link>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.18em] text-[var(--accent)]">
              {formatPlayerPosition(log.profile.position, "Player")} ·{" "}
              {seasonPhaseLabel(phase)}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-5xl">
              {log.profile.name} Game Log
            </h1>
            <p className="mt-4 text-base text-[var(--muted)]">
              {selectedSeason.label} game-by-game traditional and advanced
              performance.
            </p>
          </div>
          <SeasonPicker
            seasons={availableSeasons}
            selectedSeasonId={selectedSeason.id}
            params={{ phase, perPage: pageSize }}
          />
        </div>

        <SeasonPhaseFilter
          active={phase}
          path={`/players/${log.profile.nhlPlayerId}/games`}
          params={{ season: selectedSeason.id }}
        />

        {isGoalie ? (
          <GoalieRecentForm games={goalieGames.slice(0, 10)} />
        ) : (
          <SkaterRecentForm games={skaterGames.slice(0, 10)} />
        )}

        {skaterGames.length > 0 ? (
          <SkaterGameTable
            gamePage={skaterPage}
            seasonId={selectedSeason.id}
            playerId={log.profile.nhlPlayerId}
            phase={phase}
            pageSize={pageSize}
            sort={skaterSort}
            direction={direction}
          />
        ) : null}

        {goalieGames.length > 0 ? (
          <GoalieGameTable
            gamePage={goaliePage}
            seasonId={selectedSeason.id}
            playerId={log.profile.nhlPlayerId}
            phase={phase}
            pageSize={pageSize}
            sort={goalieSort}
            direction={direction}
          />
        ) : null}
      </section>
    </main>
  );
}
