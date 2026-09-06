import { listAdvancedGoalieLeaders, listAdvancedSkaterLeaders } from "@/data/performance-cache";
import {
  getLatestGamesForSeason,
  getUpcomingGames,
} from "@/data/games";
import { listSkaterLeadersBySeason } from "@/data/players";
import { getStandings } from "@/data/standings";
import { trackedCache } from "@/data/shared-cache";
import "server-only";
export const loadHomeSeasonData = trackedCache(
  async (seasonId: number) =>
    Promise.all([
      getStandings(seasonId),
      getLatestGamesForSeason(seasonId),
    ]),
  ["home-primary-v2"],
  { revalidate: 300 },
);

export const loadHomeUpcomingGames = trackedCache(
  () => getUpcomingGames(6),
  ["home-upcoming-games"],
  { revalidate: 300 },
);

export const loadHomeLeaders = trackedCache(async (seasonId: number) => Promise.all([
  listSkaterLeadersBySeason(seasonId, 5),
  listAdvancedSkaterLeaders(seasonId, "all", 0, 5),
  listAdvancedGoalieLeaders(seasonId, "all", 0, 5),
]), ["home-leaders-v2"], { revalidate: 300 });
