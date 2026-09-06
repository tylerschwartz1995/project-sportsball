import { withReadContext } from "@/data/read-context";
import { parseNhlId } from "@/contracts/entity";
import { parseScheduleStrengthMetric } from "@/contracts/schedule-strength";
import { parseSeasonId } from "@/contracts/season";
import {
  gameTypeForPhase,
  parseSeasonPhase
} from "@/contracts/season-phase";
import { getMoneyPuckTeamSeason } from "@/data/performance-cache";
import { getTeamSchedule } from "@/data/performance-cache";
import {
  getCachedTeamGameLog,
  getCachedTeamIdentityForSeason,
  getCachedTeamScheduleStrength,
  getCachedTeamSeasonDetail,
  getCachedTeamSeasonProfile,
  listCachedScheduleSeasons,
  listCachedSeasons,
  listCachedTeamScheduleSeasonIds,
  listCachedTeamSeasonIds,
  listCachedTeamsBySeason,
} from "@/data/page-cache";
import { getMoneyPuckSeasonUnitLeaders } from "@/data/performance-cache";
import { buildTeamSeasonIdentity } from "@/lib/team-season-identity";
import { notFound } from "next/navigation";
import "server-only";
import { TeamPageProps, firstValue, normalizeTeamView, parseTeamScheduleFilter, parseTeamView, teamViewTabs } from './logic';
async function loadTeamPageData({
  params,
  searchParams,
}: TeamPageProps) {
  const nhlTeamId = parseNhlId((await params).id);
  if (nhlTeamId === null) {
    notFound();
  }
  const pageParams = await searchParams;
  const requestedView = parseTeamView(firstValue(pageParams.view));
  const [seasons, teamSeasonIds, scheduleSeasonIds] = await Promise.all([
    requestedView === "schedule"
      ? listCachedScheduleSeasons()
      : listCachedSeasons(),
    listCachedTeamSeasonIds(nhlTeamId),
    requestedView === "schedule"
      ? listCachedTeamScheduleSeasonIds(nhlTeamId)
      : Promise.resolve([]),
  ]);
  const teamSeasonIdSet = new Set([
    ...teamSeasonIds,
    ...(requestedView === "schedule" ? scheduleSeasonIds : []),
  ]);
  const availableSeasons = seasons.filter((season) =>
    teamSeasonIdSet.has(season.id),
  );
  const chartParams = {
    chartWindow: firstValue(pageParams.chartWindow),
    chartVenue: firstValue(pageParams.chartVenue),
    showGoals: firstValue(pageParams.showGoals),
    showExpectedGoals: firstValue(pageParams.showExpectedGoals),
  };
  const requestedSeason = firstValue(pageParams.season);
  const phase = parseSeasonPhase(firstValue(pageParams.phase));
  const scheduleFilter = parseTeamScheduleFilter(
    firstValue(pageParams.scheduleState),
  );
  const scheduleStrengthMetric = parseScheduleStrengthMetric(
    firstValue(pageParams.sos),
  );
  const gameType = gameTypeForPhase(phase);
  const parsedSeason = parseSeasonId(requestedSeason);
  const selectedSeason =
    availableSeasons.find((season) => season.id === parsedSeason) ??
    availableSeasons[0];
  if (!selectedSeason) {
    notFound();
  }
  const view = normalizeTeamView(requestedView, selectedSeason.id, phase);
  const [
    detail,
    advanced,
    units,
    scheduleGames,
    scheduleTeam,
    gameLog,
    scheduleStrength,
    overviewPeers,
  ] = await Promise.all([
    view === "skaters" || view === "goalies"
      ? getCachedTeamSeasonDetail(nhlTeamId, selectedSeason.id, gameType)
      : getCachedTeamSeasonProfile(nhlTeamId, selectedSeason.id),
    view === "advanced"
      ? getMoneyPuckTeamSeason(nhlTeamId, selectedSeason.id, gameType)
      : Promise.resolve(null),
    view === "combinations"
      ? getMoneyPuckSeasonUnitLeaders(selectedSeason.id, {
        teamNhlId: nhlTeamId,
        minimumIceTimeSeconds: 3_000,
        limit: 100,
      })
      : Promise.resolve(null),
    view === "schedule"
      ? getTeamSchedule(nhlTeamId, selectedSeason.id, gameType)
      : Promise.resolve([]),
    view === "schedule"
      ? getCachedTeamIdentityForSeason(nhlTeamId, selectedSeason.id)
      : Promise.resolve(null),
    view === "trends" || view === "overview"
      ? getCachedTeamGameLog(nhlTeamId, selectedSeason.id)
      : Promise.resolve(null),
    view === "strength" && phase === "regular"
      ? getCachedTeamScheduleStrength(nhlTeamId, selectedSeason.id)
      : Promise.resolve(null),
    view === "overview"
      ? listCachedTeamsBySeason(selectedSeason.id, gameType)
      : Promise.resolve([]),
  ]);
  const profileDetail =
    detail ??
    (scheduleTeam
      ? {
        team: scheduleTeam,
        seasonId: selectedSeason.id,
        regularSeason: null,
        playoffs: null,
        skaters: [],
        goalies: [],
      }
      : null);
  if (!profileDetail) {
    notFound();
  }
  const viewTabs = teamViewTabs({
    nhlTeamId: profileDetail.team.nhlTeamId,
    seasonId: selectedSeason.id,
    phase,
    scheduleStrengthMetric,
    chartParams,
  });
  const overviewStats =
    phase === "playoffs" ? profileDetail.playoffs : profileDetail.regularSeason;
  const overviewIdentity =
    view === "overview" && overviewStats
      ? buildTeamSeasonIdentity({
        stats: overviewStats,
        peers: overviewPeers,
        games: gameLog?.games ?? [],
      })
      : null;
  return {
    selectedSeason,
    phase,
    profileDetail,
    availableSeasons,
    scheduleStrengthMetric,
    view,
    scheduleFilter,
    chartParams,
    viewTabs,
    overviewIdentity,
    overviewStats,
    gameType,
    scheduleGames,
    scheduleStrength,
    gameLog,
    advanced,
    units,
  } as const;
}

export function loadTeamPage(...args: Parameters<typeof loadTeamPageData>) {
  return withReadContext("teams/profile", () => loadTeamPageData(...args));
}
