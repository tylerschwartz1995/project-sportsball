import { Suspense } from "react";
import { buildGameFlow } from "@/lib/game-flow";
import { NavigationComplete } from "@/components/shell/navigation-metrics";
import { SiteHeader } from "@/components/shell/site-header";
import { ReturnLink } from "@/components/ui/exploration-link";
import { ViewTabs } from "@/components/ui/view-tabs";
import {
  formatGameState
} from "@/contracts/game";
import {
  GameAdvancedAnalytics
} from "@/features/games/game-advanced-analytics";
import { LocalGameTime } from "@/features/games/local-game-time";
import { GamePlayByPlayView } from "@/features/games/play-by-play";
import type { loadGamePage } from './loader';
import { finalLabel, formatDate } from './logic';
import { ScoreTeam, TeamBoxScore } from './sections';
type PageData = Awaited<ReturnType<typeof loadGamePage>>;
export function GamePageView(data: PageData) {
  const { game, completed, tabs, view, advancedView } = data;
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="games" />

      <section className="py-10">
        <ReturnLink
          fallback={`/games?season=${game.seasonId}&phase=${game.gameType === 3 ? "playoffs" : "regular"}&date=${game.gameDate}`}
        >
          ← Games on {formatDate(game.gameDate)}
        </ReturnLink>

        <div className="workspace-game-hero">
          <div className="workspace-game-hero-meta">
            <span>
              {game.gameType === 3 ? "NHL playoffs" : "Regular season"}
            </span>
            <h1 className="sr-only">
              {game.awayTeam.name} at {game.homeTeam.name}
            </h1>
            <strong>
              {completed
                ? finalLabel(game.lastPeriodType)
                : formatGameState(game.state)}
            </strong>
          </div>

          <div className="workspace-game-hero-score">
            <ScoreTeam team={game.awayTeam} seasonId={game.seasonId} />
            <div className="workspace-game-hero-at">at</div>
            <ScoreTeam
              team={game.homeTeam}
              seasonId={game.seasonId}
              align="right"
            />
          </div>

          <div className="workspace-game-hero-footer">
            <span>{formatDate(game.gameDate)}</span>
            <LocalGameTime value={game.startTimeUtc} />
          </div>
        </div>

        {!completed && tabs.length === 0 ? (
          <p className="mt-5 text-sm text-[var(--muted)]">
            Results will appear after play begins.
          </p>
        ) : null}
        {tabs.length > 0 ? (
          <ViewTabs
            active={
              view === "advanced" && advancedView === "shots" ? "shots" : view
            }
            ariaLabel="Game views"
            label="Game view"
            tabs={tabs}
          />
        ) : null}

        <Suspense fallback={<p role="status" className="workspace-empty-state">Loading game details…</p>}>
          <GameContent {...data} />
        </Suspense>
      </section>
    </main>
  );
}

async function GameContent({ content, game, view, advancedView, timelinePeriod, hasBoxScore, boxScore, availability }: PageData) {
  const [advanced, playByPlay] = await content;
  const gameFlow = buildGameFlow({ shots: advanced?.shots ?? [], events: playByPlay.events,
    awayTeam: game.awayTeam, homeTeam: game.homeTeam });
  return <>
        {view === "scoring" ? (
          <GamePlayByPlayView
            data={playByPlay}
            awayTeam={game.awayTeam}
            homeTeam={game.homeTeam}
            seasonId={game.seasonId}
            gameFlow={gameFlow}
            timelinePeriod={timelinePeriod}
          />
        ) : null}

        {view === "box-score" && hasBoxScore && boxScore ? (
          <div
            id="box-score"
            className="workspace-width-standard mt-12 space-y-14 scroll-mt-6"
          >
            <TeamBoxScore team={boxScore.awayTeam} seasonId={game.seasonId} />
            <TeamBoxScore team={boxScore.homeTeam} seasonId={game.seasonId} />
          </div>
        ) : view === "box-score" ? (
          <div className="mt-10 rounded-2xl border border-[color-mix(in_srgb,var(--warning)_42%,var(--border))] bg-[var(--warning-soft)] p-6 text-[var(--warning)]">
            The player box score is not available yet.
          </div>
        ) : null}

        {view === "advanced" && availability.advanced && advanced ? (
          <div>
            <GameAdvancedAnalytics data={advanced} view={advancedView} />
          </div>
        ) : null}
    <NavigationComplete />
  </>;
}
