import { parseNhlId } from "@/contracts/entity";
import {
  type GameBoxScore,
  type GameSummary
} from "@/contracts/game";
import { getMoneyPuckGameAnalytics } from "@/data/advanced-game";
import {
  getGameBoxScore,
  getGameSummary,
  getGameViewAvailability,
} from "@/data/games";
import { getGamePlayByPlay } from "@/data/play-by-play";
import { buildGameFlow } from "@/lib/game-flow";
import { parseTimelinePeriod } from "@/lib/play-by-play-timeline";
import { notFound } from "next/navigation";
import "server-only";
import { GamePageProps, firstValue, normalizeGameView, parseGameAdvancedView, parseGameView } from './logic';
export async function loadGamePage({
  params,
  searchParams,
}: GamePageProps) {
  const [routeParams, pageParams] = await Promise.all([params, searchParams]);
  const nhlGameId = parseNhlId(routeParams.id);
  if (nhlGameId === null) {
    notFound();
  }
  const requestedView = parseGameView(firstValue(pageParams.view));
  const [initialGame, availability] = await Promise.all([
    requestedView === "box-score"
      ? getGameBoxScore(nhlGameId)
      : getGameSummary(nhlGameId),
    getGameViewAvailability(nhlGameId),
  ]);
  if (!initialGame) {
    notFound();
  }
  let game: GameSummary = initialGame;
  let boxScore: GameBoxScore | null =
    requestedView === "box-score" ? (initialGame as GameBoxScore) : null;
  const completed =
    game.awayTeam.score !== null && game.homeTeam.score !== null;
  const view = normalizeGameView(requestedView, {
    scoring: availability.scoring,
    boxScore: availability.boxScore,
    advanced: availability.advanced,
  });
  if (view === "box-score" && requestedView !== "box-score") {
    const loadedBoxScore = await getGameBoxScore(nhlGameId);
    if (!loadedBoxScore) notFound();
    boxScore = loadedBoxScore;
    game = loadedBoxScore;
  }
  const [advanced, playByPlay] = await Promise.all([
    view === "advanced" || view === "scoring"
      ? getMoneyPuckGameAnalytics(nhlGameId)
      : Promise.resolve(null),
    view === "scoring"
      ? getGamePlayByPlay(nhlGameId)
      : Promise.resolve({ nhlGameId, events: [] }),
  ]);
  const hasBoxScore = availability.boxScore;
  const advancedView = parseGameAdvancedView(
    firstValue(pageParams.advancedView),
  );
  const timelinePeriod = parseTimelinePeriod(
    firstValue(pageParams.timelinePeriod),
  );
  const tabs = [
    availability.scoring
      ? {
        id: "scoring" as const,
        label: "Scoring & Timeline",
        href: `/games/${game.nhlGameId}?view=scoring`,
      }
      : null,
    hasBoxScore
      ? {
        id: "box-score" as const,
        label: "Box Score",
        href: `/games/${game.nhlGameId}?view=box-score`,
        prefetch: true,
      }
      : null,
    availability.advanced
      ? {
        id: "advanced" as const,
        label: "Shot Quality",
        href: `/games/${game.nhlGameId}?view=advanced&advancedView=teams`,
      }
      : null,
    availability.advanced
      ? {
        id: "shots" as const,
        label: "Shot Maps",
        href: `/games/${game.nhlGameId}?view=advanced&advancedView=shots`,
      }
      : null,
  ].filter((tab): tab is NonNullable<typeof tab> => tab !== null);
  const gameFlow = buildGameFlow({
    shots: advanced?.shots ?? [],
    events: playByPlay.events,
    awayTeam: game.awayTeam,
    homeTeam: game.homeTeam,
  });
  return {
    game,
    completed,
    tabs,
    view,
    advancedView,
    gameFlow,
    timelinePeriod,
    hasBoxScore,
    boxScore,
    playByPlay,
    availability,
    advanced,
  } as const;
}
