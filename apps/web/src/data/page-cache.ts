import "server-only";

import { unstable_cache } from "next/cache";

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
export const listCachedSeasons = unstable_cache(
  listSeasons,
  ["page-seasons-v1"],
  { revalidate: REFERENCE_DATA_SECONDS, tags: ["seasons"] },
);

export const listCachedScheduleSeasons = unstable_cache(
  listScheduleSeasons,
  ["page-schedule-seasons-v1"],
  { revalidate: REFERENCE_DATA_SECONDS, tags: ["seasons"] },
);

export const getCachedStandings = unstable_cache(
  getStandings,
  ["page-standings-v1"],
  { revalidate: ACTIVE_DATA_SECONDS, tags: ["standings"] },
);

export const getCachedStandingsPointsHistory = unstable_cache(
  getStandingsPointsHistory,
  ["page-standings-points-history-v1"],
  { revalidate: ACTIVE_DATA_SECONDS, tags: ["standings"] },
);

export const listCachedTeamsBySeason = unstable_cache(
  listTeamsBySeason,
  ["page-teams-by-season-v1"],
  { revalidate: ACTIVE_DATA_SECONDS, tags: ["teams"] },
);

export const getCachedTeamScheduleStrength = unstable_cache(
  getTeamScheduleStrength,
  ["page-team-schedule-strength-v1"],
  { revalidate: ACTIVE_DATA_SECONDS, tags: ["teams", "games"] },
);

export const listCachedTeamSeasonIds = unstable_cache(
  listTeamSeasonIds,
  ["page-team-season-ids-v1"],
  { revalidate: ACTIVE_DATA_SECONDS, tags: ["teams", "seasons"] },
);

export const listCachedTeamScheduleSeasonIds = unstable_cache(
  listTeamScheduleSeasonIds,
  ["page-team-schedule-season-ids-v1"],
  { revalidate: ACTIVE_DATA_SECONDS, tags: ["teams", "games", "seasons"] },
);

export const getCachedTeamSeasonProfile = unstable_cache(
  getTeamSeasonProfile,
  ["page-team-season-profile-v1"],
  { revalidate: ACTIVE_DATA_SECONDS, tags: ["teams", "games"] },
);

export const getCachedTeamSeasonDetail = unstable_cache(
  getTeamSeasonDetail,
  ["page-team-season-detail-v1"],
  { revalidate: ACTIVE_DATA_SECONDS, tags: ["teams", "players", "games"] },
);

export const getCachedTeamIdentityForSeason = unstable_cache(
  getTeamIdentityForSeason,
  ["page-team-identity-v1"],
  { revalidate: ACTIVE_DATA_SECONDS, tags: ["teams", "seasons"] },
);

export const getCachedTeamGameLog = unstable_cache(
  getTeamGameLog,
  ["page-team-game-log-v1"],
  { revalidate: ACTIVE_DATA_SECONDS, tags: ["teams", "games"] },
);
