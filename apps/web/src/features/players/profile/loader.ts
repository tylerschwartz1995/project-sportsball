import { withReadContext } from "@/data/read-context";
import { parseNhlId } from "@/contracts/entity";
import {
  parseSeasonPhase
} from "@/contracts/season-phase";
import { getPlayerCareerAdvanced } from "@/data/player-career";
import { getPlayerCareer } from "@/data/performance-cache";
import { getPlayerDetail } from "@/data/performance-cache";
import { notFound } from "next/navigation";
import "server-only";
import { PlayerPageProps, firstValue } from './logic';
async function loadPlayerPageData({
  params,
  searchParams,
}: PlayerPageProps) {
  const [routeParams, pageParams] = await Promise.all([params, searchParams]);
  const nhlPlayerId = parseNhlId(routeParams.id);
  if (nhlPlayerId === null) {
    notFound();
  }
  const [detail, careerArchive, careerAdvanced] = await Promise.all([
    getPlayerDetail(nhlPlayerId),
    getPlayerCareer(nhlPlayerId),
    getPlayerCareerAdvanced(nhlPlayerId),
  ]);
  if (!detail) {
    notFound();
  }
  const careerKeys = new Set(
    careerArchive.map((row) => `${row.kind}-${row.seasonId}-${row.gameType}`),
  );
  const combinedCareer = [
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
  const career = combinedCareer.map(row => {
    const basic = row.kind === "skater"
      ? detail.skaterSeasons.find(s => s.seasonId === row.seasonId && s.gameType === row.gameType)
      : detail.goalieSeasons.find(s => s.seasonId === row.seasonId && s.gameType === row.gameType);
    const extra = basic?.kind === "skater" ? {
      plusMinus: basic.plusMinus, shots: basic.shotsOnGoal, powerPlayPoints: basic.powerPlayPoints,
      penaltyMinutes: basic.penaltyMinutes, hits: basic.hits,
    } : basic?.kind === "goalie" ? {
      goalsAgainst: basic.goalsAgainst, timeOnIceSeconds: basic.timeOnIceSeconds,
      losses: basic.losses, overtimeLosses: basic.overtimeLosses, shutouts: basic.shutouts,
      savePercentage: basic.savePercentage,
      goalsAgainstAverage: basic.timeOnIceSeconds > 0 ? basic.goalsAgainst * 3600 / basic.timeOnIceSeconds : null,
    } : {};
    const advanced = row.gameType === 2 ? careerAdvanced.find(s => s.seasonId === row.seasonId && s.kind === row.kind) : undefined;
    return { ...extra, ...row, hits: basic?.kind === "skater" ? basic.hits : null, ...advanced };
  });
  const latestSkater = [...detail.skaterSeasons].sort((a, b) => b.seasonId - a.seasonId || a.gameType - b.gameType)[0];
  const latestGoalie = [...detail.goalieSeasons].sort((a, b) => b.seasonId - a.seasonId || a.gameType - b.gameType)[0];
  return {
    phase: parseSeasonPhase(firstValue(pageParams.phase)),
    selectedTeams: latestSkater?.teams ?? latestGoalie?.teams ?? [],
    profile: detail.profile,
    career,
  } as const;
}

export function loadPlayerPage(...args: Parameters<typeof loadPlayerPageData>) {
  return withReadContext("players/profile", () => loadPlayerPageData(...args));
}
