import { withReadContext } from "@/data/read-context";
import { parseNhlId } from "@/contracts/entity";
import { parseSeasonId } from "@/contracts/season";
import {
  gameTypeForPhase,
  parseSeasonPhase
} from "@/contracts/season-phase";
import { getMoneyPuckPlayerSeason } from "@/data/performance-cache";
import { getPlayerGameLog } from "@/data/performance-cache";
import { listCachedSeasons } from "@/data/page-cache";
import { getPlayerCareer } from "@/data/performance-cache";
import { getPlayerDetail } from "@/data/performance-cache";
import { notFound } from "next/navigation";
import "server-only";
import { PlayerPageProps, firstValue, parsePlayerView } from './logic';
async function loadPlayerPageData({
  params,
  searchParams,
}: PlayerPageProps) {
  const [routeParams, pageParams] = await Promise.all([params, searchParams]);
  const nhlPlayerId = parseNhlId(routeParams.id);
  if (nhlPlayerId === null) {
    notFound();
  }
  const view = parsePlayerView(firstValue(pageParams.view));
  const chartParams = {
    chartWindow: firstValue(pageParams.chartWindow),
    chartVenue: firstValue(pageParams.chartVenue),
    chartMetric: firstValue(pageParams.chartMetric),
  };
  const [detail, seasons, careerArchive] = await Promise.all([
    getPlayerDetail(nhlPlayerId),
    listCachedSeasons(),
    getPlayerCareer(nhlPlayerId),
  ]);
  if (!detail) {
    notFound();
  }
  const careerKeys = new Set(
    careerArchive.map((row) => `${row.kind}-${row.seasonId}-${row.gameType}`),
  );
  const career = [
    ...careerArchive,
    ...detail.skaterSeasons
      .filter(
        (row) => !careerKeys.has(`skater-${row.seasonId}-${row.gameType}`),
      )
      .map((row) => ({
        kind: "skater" as const,
        seasonId: row.seasonId,
        gameType: row.gameType,
        teams: row.teams.map((team) => team.abbreviation).join(","),
        games: row.gamesPlayed,
        goals: row.goals,
        assists: row.assists,
        points: row.points,
        wins: null,
        saves: null,
        shotsAgainst: null,
      })),
    ...detail.goalieSeasons
      .filter(
        (row) => !careerKeys.has(`goalie-${row.seasonId}-${row.gameType}`),
      )
      .map((row) => ({
        kind: "goalie" as const,
        seasonId: row.seasonId,
        gameType: row.gameType,
        teams: row.teams.map((team) => team.abbreviation).join(","),
        games: row.gamesPlayed,
        goals: null,
        assists: null,
        points: null,
        wins: row.wins,
        saves: row.saves,
        shotsAgainst: row.shotsAgainst,
      })),
  ].sort((left, right) => right.seasonId - left.seasonId);
  const careerSeasonIds = new Set([
    ...career.map((row) => row.seasonId),
    ...detail.skaterSeasons.map((row) => row.seasonId),
    ...detail.goalieSeasons.map((row) => row.seasonId),
  ]);
  const careerSeasons = [...careerSeasonIds]
    .sort((a, b) => b - a)
    .map((id) => ({
      id,
      startYear: Math.floor(id / 10000),
      endYear: id % 10000,
      label: `${Math.floor(id / 10000)}–${String(id % 10000).slice(-2)}`,
    }));
  const requestedSeason = parseSeasonId(firstValue(pageParams.season));
  const phase = parseSeasonPhase(firstValue(pageParams.phase));
  const selectedSeason =
    careerSeasons.find((season) => season.id === requestedSeason) ??
    careerSeasons[0];
  const selectedSkaterRows = detail.skaterSeasons.filter(
    (row) => row.seasonId === selectedSeason?.id,
  );
  const selectedGoalieRows = detail.goalieSeasons.filter(
    (row) => row.seasonId === selectedSeason?.id,
  );
  const regularSkater = selectedSkaterRows.find((row) => row.gameType === 2);
  const playoffSkater = selectedSkaterRows.find((row) => row.gameType === 3);
  const regularGoalie = selectedGoalieRows.find((row) => row.gameType === 2);
  const playoffGoalie = selectedGoalieRows.find((row) => row.gameType === 3);
  const selectedTeams =
    (phase === "playoffs" ? playoffSkater?.teams : regularSkater?.teams) ??
    (phase === "playoffs" ? playoffGoalie?.teams : regularGoalie?.teams) ??
    [];
  const profile = detail.profile;
  const [advanced, gameLog] = selectedSeason
    ? await Promise.all([
      view === "advanced" && phase === "regular"
        ? getMoneyPuckPlayerSeason(nhlPlayerId, selectedSeason.id)
        : Promise.resolve(null),
      view === "trends"
        ? getPlayerGameLog(nhlPlayerId, selectedSeason.id)
        : Promise.resolve(null),
    ])
    : [null, null];
  const gameType = gameTypeForPhase(phase);
  const skaterPerformanceGames =
    gameLog?.skaterGames
      .filter((game) => game.gameType === gameType)
      .map((game) => ({
        nhlGameId: game.nhlGameId,
        gameDate: game.gameDate,
        isHome: game.isHome,
        team: game.team,
        opponent: game.opponent,
        teamScore: game.teamScore,
        opponentScore: game.opponentScore,
        points: game.points,
        goals: game.goals,
        assists: game.assists,
        shotsOnGoal: game.shotsOnGoal,
        gameScore: game.gameScore,
        individualXGoals: game.individualXGoals,
        onIceXGoalsPercentage: game.onIceXGoalsPercentage,
      })) ?? [];
  const goaliePerformanceGames =
    gameLog?.goalieGames
      .filter((game) => game.gameType === gameType)
      .map((game) => ({
        nhlGameId: game.nhlGameId,
        gameDate: game.gameDate,
        isHome: game.isHome,
        team: game.team,
        opponent: game.opponent,
        teamScore: game.teamScore,
        opponentScore: game.opponentScore,
        saves: game.saves,
        shotsAgainst: game.shotsAgainst,
        goalsAgainst: game.goalsAgainst,
        expectedGoalsAgainst: game.expectedGoalsAgainst,
        goalsSavedAboveExpected: game.goalsSavedAboveExpected,
      })) ?? [];
  return {
    selectedSeason,
    phase,
    selectedTeams,
    profile,
    view,
    careerSeasons,
    chartParams,
    regularSkater,
    playoffSkater,
    regularGoalie,
    playoffGoalie,
    career,
    nhlPlayerId,
    skaterPerformanceGames,
    goaliePerformanceGames,
    seasons,
    advanced,
  } as const;
}

export function loadPlayerPage(...args: Parameters<typeof loadPlayerPageData>) {
  return withReadContext("players/profile", () => loadPlayerPageData(...args));
}
