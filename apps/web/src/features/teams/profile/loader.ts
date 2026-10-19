import { withReadContext } from "@/data/read-context";
import { parseNhlId } from "@/contracts/entity";
import { parseSeasonId } from "@/contracts/season";
import {
  gameTypeForPhase,
  parseSeasonPhase
} from "@/contracts/season-phase";
import { getMoneyPuckTeamSeason } from "@/data/performance-cache";
import { getTeamSchedule } from "@/data/performance-cache";
import {
  getCachedTeamIdentityForSeason,
  getCachedTeamSeasonDetail,
  getCachedTeamSeasonProfile,
  listCachedScheduleSeasons,
  listCachedSeasons,
  listCachedTeamScheduleSeasonIds,
  listCachedTeamSeasonIds,
} from "@/data/page-cache";
import { notFound } from "next/navigation";
import "server-only";
import { TeamPageProps, firstValue, parseTeamScheduleFilter, parseTeamView, teamViewTabs } from './logic';
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
  const requestedSeason = firstValue(pageParams.season);
  const phase = parseSeasonPhase(firstValue(pageParams.phase));
  const scheduleFilter = parseTeamScheduleFilter(
    firstValue(pageParams.scheduleState),
  );
  const gameType = gameTypeForPhase(phase);
  const parsedSeason = parseSeasonId(requestedSeason);
  const selectedSeason =
    availableSeasons.find((season) => season.id === parsedSeason) ??
    availableSeasons[0];
  if (!selectedSeason) {
    notFound();
  }
  const view = requestedView;
  const [
    detail,
    advanced,
    scheduleGames,
    scheduleTeam,
  ] = await Promise.all([
    view === "skaters" || view === "goalies"
      ? getCachedTeamSeasonDetail(nhlTeamId, selectedSeason.id, gameType)
      : getCachedTeamSeasonProfile(nhlTeamId, selectedSeason.id),
    view === "advanced"
      ? getMoneyPuckTeamSeason(nhlTeamId, selectedSeason.id, gameType)
      : Promise.resolve(null),
    view === "schedule"
      ? getTeamSchedule(nhlTeamId, selectedSeason.id, gameType)
      : Promise.resolve([]),
    view === "schedule"
      ? getCachedTeamIdentityForSeason(nhlTeamId, selectedSeason.id)
      : Promise.resolve(null),
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
  });
  const overviewStats =
    phase === "playoffs" ? profileDetail.playoffs : profileDetail.regularSeason;
  return {
    selectedSeason,
    phase,
    profileDetail,
    availableSeasons,
    view,
    scheduleFilter,
    viewTabs,
    overviewStats,
    gameType,
    scheduleGames,
    advanced,
  } as const;
}

export function loadTeamPage(...args: Parameters<typeof loadTeamPageData>) {
  return withReadContext("teams/profile", () => loadTeamPageData(...args));
}
