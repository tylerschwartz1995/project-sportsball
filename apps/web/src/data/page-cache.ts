import "server-only";

import { unstable_cache } from "next/cache";

import { listScheduleSeasons, listSeasons } from "@/data/seasons";
import { getStandings, getStandingsPointsHistory } from "@/data/standings";
import { listTeamsBySeason } from "@/data/teams";

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
