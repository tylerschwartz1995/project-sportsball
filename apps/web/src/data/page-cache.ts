import "server-only";

import { trackedCache } from "@/data/shared-cache";

import { listScheduleSeasons, listSeasons } from "@/data/seasons";
import { getTeamScheduleStrength } from "@/data/schedule-strength";
import { getStandings, getStandingsPointsHistory } from "@/data/standings";
import { getTeamGameLog } from "@/data/game-logs";
import { listTeamScheduleSeasonIds } from "@/data/games";
import {
  getTeamIdentityForSeason,
  getTeamSeasonDetail,
  getTeamSeasonProfile,
  listTeamSeasonIds,
  listTeamsBySeason,
} from "@/data/teams";

const REFERENCE_DATA_SECONDS = 3_600;
const ACTIVE_DATA_SECONDS = 300;

/** Shared page reads with lifetimes aligned to the documented API policy. */
export const listCachedSeasons = trackedCache(
  listSeasons,
  ["page-seasons-v1"],
  { revalidate: REFERENCE_DATA_SECONDS, tags: ["seasons"] },
);

export const listCachedScheduleSeasons = trackedCache(
  listScheduleSeasons,
  ["page-schedule-seasons-v1"],
  { revalidate: REFERENCE_DATA_SECONDS, tags: ["seasons"] },
);

export const getCachedStandings = trackedCache(
  getStandings,
  ["page-standings-v1"],
  { revalidate: ACTIVE_DATA_SECONDS, tags: ["standings"] },
);

export const getCachedStandingsPointsHistory = trackedCache(
  getStandingsPointsHistory,
  ["page-standings-points-history-v1"],
  { revalidate: ACTIVE_DATA_SECONDS, tags: ["standings"] },
);

export const listCachedTeamsBySeason = trackedCache(
  listTeamsBySeason,
  ["page-teams-by-season-v1"],
  { revalidate: ACTIVE_DATA_SECONDS, tags: ["teams"] },
);

export const getCachedTeamScheduleStrength = trackedCache(
  getTeamScheduleStrength,
  ["page-team-schedule-strength-v1"],
  { revalidate: ACTIVE_DATA_SECONDS, tags: ["teams", "games"] },
);

export const listCachedTeamSeasonIds = trackedCache(
  listTeamSeasonIds,
  ["page-team-season-ids-v1"],
  { revalidate: ACTIVE_DATA_SECONDS, tags: ["teams", "seasons"] },
);

export const listCachedTeamScheduleSeasonIds = trackedCache(
  listTeamScheduleSeasonIds,
  ["page-team-schedule-season-ids-v1"],
  { revalidate: ACTIVE_DATA_SECONDS, tags: ["teams", "games", "seasons"] },
);

export const getCachedTeamSeasonProfile = trackedCache(
  getTeamSeasonProfile,
  ["page-team-season-profile-v1"],
  { revalidate: ACTIVE_DATA_SECONDS, tags: ["teams", "games"] },
);

export const getCachedTeamSeasonDetail = trackedCache(
  getTeamSeasonDetail,
  ["page-team-season-detail-v1"],
  { revalidate: ACTIVE_DATA_SECONDS, tags: ["teams", "players", "games"] },
);

export const getCachedTeamIdentityForSeason = trackedCache(
  getTeamIdentityForSeason,
  ["page-team-identity-v1"],
  { revalidate: ACTIVE_DATA_SECONDS, tags: ["teams", "seasons"] },
);

export const getCachedTeamGameLog = trackedCache(
  getTeamGameLog,
  ["page-team-game-log-v1"],
  { revalidate: ACTIVE_DATA_SECONDS, tags: ["teams", "games"] },
);
