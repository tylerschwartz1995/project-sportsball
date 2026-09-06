import { NavigationComplete } from "@/components/shell/navigation-metrics";
import { SiteHeader } from "@/components/shell/site-header";
import Link from "@/components/ui/exploration-link";
import { ResultNavigation } from "@/components/ui/result-navigation";
import { SortableHeader } from "@/components/ui/sortable-header";
import { SortableTable } from "@/components/ui/sortable-table";
import {
  seasonPhaseLabel
} from "@/contracts/season-phase";
import { SeasonPhaseFilter } from "@/features/league/season-phase-filter";
import { SeasonPicker } from "@/features/league/season-picker";
import { TeamLogo } from "@/features/teams/team-logo";
import type { loadTeamGamesPage } from './loader';
import { formatDate, resultClassName } from './logic';
import { TeamGameRow } from './sections';
export function TeamGamesPageView({
  log,
  selectedSeason,
  phase,
  availableSeasons,
  pageSize,
  recentGames,
  gamePage,
  sort,
  direction,
  navigationParams,
}: Awaited<ReturnType<typeof loadTeamGamesPage>>) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="teams" />

      <section className="py-10">
        <Link
          href={`/teams/${log.team.nhlTeamId}?season=${selectedSeason.id}&phase=${phase}`}
          className="text-sm font-medium text-[var(--accent)] transition hover:text-[var(--foreground)]"
        >
          ← {log.team.name}
        </Link>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <TeamLogo {...log.team} size="compact" decorative />
            <div>
              <p className="font-mono text-sm uppercase tracking-[0.18em] text-[var(--accent)]">
                {log.team.abbreviation} · {seasonPhaseLabel(phase)}
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-5xl">
                {log.team.name} Game Log
              </h1>
              <p className="mt-4 text-base text-[var(--muted)]">
                {selectedSeason.label} results, shot totals, and five-on-five
                expected-goal share.
              </p>
            </div>
          </div>
          <SeasonPicker
            seasons={availableSeasons}
            selectedSeasonId={selectedSeason.id}
            params={{ phase, perPage: pageSize }}
          />
        </div>

        <SeasonPhaseFilter
          active={phase}
          path={`/teams/${log.team.nhlTeamId}/games`}
          params={{ season: selectedSeason.id }}
        />

        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
                Recent form
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                Last {recentGames.length} Games
              </h3>
            </div>
          </div>

          <div
            className="mt-5 flex flex-wrap gap-2"
            aria-label="Recent game results"
          >
            {recentGames.map((game) => (
              <Link
                key={game.nhlGameId}
                href={`/games/${game.nhlGameId}`}
                title={`${formatDate(game.gameDate)}: ${game.isHome ? "vs" : "at"} ${game.opponent.name}, ${game.score}-${game.opponentScore}`}
                className={`inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition hover:-translate-y-0.5 ${resultClassName(game.result)}`}
              >
                {game.result}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12" id="game-log-results">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
                Full season
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                {seasonPhaseLabel(phase)} Games
              </h3>
            </div>
            <p className="text-sm text-[var(--muted)]">
              {gamePage.firstItem}–{gamePage.lastItem} of {gamePage.totalItems} completed games
            </p>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--table-background)]">
            <SortableTable secondaryColumns={[2, 10, 11]} initialExpanded={["type", "xGoalsFor", "xGoalsAgainst"].includes(sort)} defaultSortKey={sort} defaultDirection={direction} urlBacked scrollTarget="game-log-results">
              <div className="workspace-table-scroll-viewport">
                <table className="workspace-table-dense workspace-sticky-table-header w-full min-w-[1040px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                      <SortableHeader
                        label="Date"
                        sortKey="date"
                        align="left"
                      />
                      <SortableHeader
                        label="Type"
                        sortKey="type"
                        align="left"
                      />
                      <SortableHeader
                        label="Venue"
                        sortKey="venue"
                        align="left"
                        defaultDirection="asc"
                      />
                      <SortableHeader
                        label="Opponent"
                        sortKey="opponent"
                        align="left"
                        defaultDirection="asc"
                      />
                      <SortableHeader
                        label="Result"
                        sortKey="result"
                        align="left"
                      />
                      <SortableHeader label="Score" sortKey="score" />
                      <SortableHeader label="SOG" sortKey="shots" />
                      <SortableHeader label="Opp SOG" sortKey="opponentShots" />
                      <SortableHeader label="5v5 xG%" sortKey="xGoalsShare" />
                      <SortableHeader label="xGF" sortKey="xGoalsFor" />
                      <SortableHeader label="xGA" sortKey="xGoalsAgainst" />
                    </tr>
                  </thead>
                  <tbody>
                    {gamePage.items.map((game) => (
                      <TeamGameRow
                        key={game.nhlGameId}
                        game={game}
                        seasonId={selectedSeason.id}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </SortableTable>
          </div>
          <ResultNavigation
            path={`/teams/${log.team.nhlTeamId}/games`}
            params={navigationParams}
            currentPage={gamePage.currentPage}
            totalPages={gamePage.totalPages}
            firstItem={gamePage.firstItem}
            lastItem={gamePage.lastItem}
            totalItems={gamePage.totalItems}
            pageSize={pageSize}
            scrollTarget="game-log-results"
          />
          <p className="mt-3 text-xs text-[var(--muted)]">
            Advanced columns are five-on-five MoneyPuck metrics. A dash means
            that provider coverage is unavailable for that game.
          </p>
        </section>
      </section>
    <NavigationComplete />
    </main>
  );
}
