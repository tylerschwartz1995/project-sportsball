import { withReadContext } from "@/data/read-context";
import { parseNhlId } from "@/contracts/entity";
import {
  type GameBoxScore,
  type GameSummary
} from "@/contracts/game";
import { getMoneyPuckGameAnalytics } from "@/data/performance-cache";
import { getGameBoxScore, getGameSummary, getGameViewAvailability } from "@/data/performance-cache";
import { getGamePlayByPlay } from "@/data/performance-cache";
import { notFound } from "next/navigation";
import "server-only";
import { GamePageProps, firstValue, normalizeGameView, parseGameView } from './logic';
async function loadGamePageData({
  params,
  searchParams,
}: GamePageProps) {
  const [routeParams, pageParams] = await Promise.all([params, searchParams]);
  const nhlGameId = parseNhlId(routeParams.id);
  if (nhlGameId === null) {
    notFound();
  }
  const parsedView = parseGameView(firstValue(pageParams.view));
  const requestedView = parsedView === "advanced" ? (firstValue(pageParams.advancedView) === "shots" ? "shot-map" : firstValue(pageParams.advancedView) === "combinations" ? "lines" : firstValue(pageParams.advancedView) === "players" ? "box-score" : "team-stats") : parsedView;
  const [initialGame, availability] = await Promise.all([
    (requestedView === "box-score" || requestedView === "team-stats")
      ? getGameBoxScore(nhlGameId)
      : getGameSummary(nhlGameId),
    getGameViewAvailability(nhlGameId),
  ]);
  if (!initialGame) {
    notFound();
  }
  let game: GameSummary = initialGame;
  let boxScore: GameBoxScore | null =
    (requestedView === "box-score" || requestedView === "team-stats") ? (initialGame as GameBoxScore) : null;
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
  const content = Promise.all([
    view === "team-stats" || view === "lines" || view === "shot-map" || view === "game-flow"
      ? getMoneyPuckGameAnalytics(nhlGameId, view === "game-flow" ? "scoring" : view === "lines" ? "combinations" : view === "shot-map" ? "shots" : "teams")
      : view === "box-score"
        ? getMoneyPuckGameAnalytics(nhlGameId, "players")
        : Promise.resolve(null),
    (view === "scoring" || view === "game-flow" || view === "team-stats")
      ? getGamePlayByPlay(nhlGameId)
      : Promise.resolve({ nhlGameId, events: [] }),
  ]);
  const hasBoxScore = availability.boxScore;
  const tabs = [
    availability.scoring
      ? {
        id: "scoring" as const,
        label: "Scoring",
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
    availability.scoring || availability.advanced
      ? { id: "game-flow" as const, label: "Game Flow", href: `/games/${game.nhlGameId}?view=game-flow` } : null,
    ...(availability.advanced ? [
      { id: "team-stats" as const, label: "Team Stats", href: `/games/${game.nhlGameId}?view=team-stats` },
    ] : []),
    availability.advanced
      ? { id: "shot-map" as const, label: "Shot Map", href: `/games/${game.nhlGameId}?view=shot-map` } : null,
    availability.advanced
      ? { id: "lines" as const, label: "Lines", href: `/games/${game.nhlGameId}?view=lines` } : null,
  ].filter((tab): tab is NonNullable<typeof tab> => tab !== null);
  return {
    game,
    completed,
    tabs,
    view,
    hasBoxScore,
    boxScore,
    availability,
    content,
  } as const;
}

export function loadGamePage(...args: Parameters<typeof loadGamePageData>) {
  return withReadContext("games/detail", () => loadGamePageData(...args));
}
