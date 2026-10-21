import { GameAnalysisPanel } from "../game-analysis-panels";
import { Suspense } from "react";
import { GameFlowChart } from "@/features/charts/lazy-charts";
import { buildGameFlow } from "@/lib/game-flow";
import { NavigationComplete } from "@/components/shell/navigation-metrics";
import { SiteHeader } from "@/components/shell/site-header";
import { ReturnLink } from "@/components/ui/exploration-link";
import { ViewTabs } from "@/components/ui/view-tabs";
import {
  formatGameState
} from "@/contracts/game";
import { LocalGameTime } from "@/features/games/local-game-time";
import { GamePlayByPlayView } from "@/features/games/play-by-play";
import type { loadGamePage } from './loader';
import { finalLabel, formatDate } from './logic';
import { BoxScoreSelector } from "./box-score-selector";
import { ScoreTeam } from './sections';
type PageData = Awaited<ReturnType<typeof loadGamePage>>;
export function GamePageView(data: PageData) {
  const { game, completed, tabs, view } = data;
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="games" />

      <section className="py-10">
        <ReturnLink
          returnLabel="← Back to Games"
          fallback={`/games?season=${game.seasonId}&phase=${game.gameType === 3 ? "playoffs" : "regular"}&date=${game.gameDate}`}
        >
          ← Back to Games
        </ReturnLink>

        <div className="workspace-game-hero reference-game-result">
          <div className="workspace-game-hero-meta">
            <span>
              {formatDate(game.gameDate)} · {game.gameType === 3 ? "Playoffs" : "Regular season"}
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

            <ScoreTeam
              team={game.homeTeam}
              seasonId={game.seasonId}
              align="right"
            />
          </div>

          {!completed ? <div className="workspace-game-hero-footer"><LocalGameTime value={game.startTimeUtc} /></div> : null}
        </div>

        {!completed && tabs.length === 0 ? (
          <p className="mt-5 text-sm text-[var(--muted)]">
            Results will appear after play begins.
          </p>
        ) : null}
        {tabs.length > 0 ? (
          <ViewTabs
            active={view}
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

async function GameContent({ content, game, view, hasBoxScore, boxScore }: PageData) {
  const [advanced, playByPlay] = await content;
  const gameFlow = view === "game-flow" ? buildGameFlow({ shots: advanced?.shots ?? [], events: playByPlay.events,
    awayTeam: game.awayTeam, homeTeam: game.homeTeam }) : null;
  return <>
        {view === "scoring" ? (
          <GamePlayByPlayView
            data={playByPlay}
            awayTeam={game.awayTeam}
            homeTeam={game.homeTeam}
            seasonId={game.seasonId}
          />
        ) : null}

        {view === "game-flow" ? (
          gameFlow ? <GameFlowChart flow={gameFlow} /> : (
            <p className="workspace-game-flow-unavailable">
              Game Flow is unavailable for this game. MoneyPuck modeled-shot
              coverage begins in 2007–08 and occasionally excludes individual games.
            </p>
          )
        ) : null}

        {view === "box-score" && hasBoxScore && boxScore ? (
          <BoxScoreSelector skaterSituations={advanced?.skaterSituations ?? []} goalieSituations={advanced?.goalieSituations ?? []} awayTeam={boxScore.awayTeam} homeTeam={boxScore.homeTeam} seasonId={game.seasonId} />
        ) : view === "box-score" ? (
          <div className="mt-10 rounded-2xl border border-[color-mix(in_srgb,var(--warning)_42%,var(--border))] bg-[var(--warning-soft)] p-6 text-[var(--warning)]">
            The player box score is not available yet.
          </div>
        ) : null}

        {(view === "team-stats" || view === "lines" || view === "shot-map") ? (
          advanced ? <GameAnalysisPanel data={advanced} view={view} boxScore={boxScore} events={playByPlay.events} /> : <p className="mt-6 text-[var(--muted)]">Data is unavailable for this game.</p>
        ) : null}
    <NavigationComplete />
  </>;
}
