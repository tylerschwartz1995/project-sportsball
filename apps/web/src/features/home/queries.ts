import { listAdvancedGoalieLeaders, listAdvancedSkaterLeaders } from "@/data/advanced-leaderboard";
import {
  getLatestGamesForSeason,
  getUpcomingGames,
} from "@/data/games";
import { listSkaterLeadersBySeason } from "@/data/players";
import { getStandings } from "@/data/standings";
import { unstable_cache } from "next/cache";
import "server-only";
export const loadHomeSeasonData = unstable_cache(
  async (seasonId: number) =>
    Promise.all([
      getStandings(seasonId),
      listSkaterLeadersBySeason(seasonId, 5),
      getLatestGamesForSeason(seasonId),
      listAdvancedSkaterLeaders(seasonId, "all", 0),
      listAdvancedGoalieLeaders(seasonId, "all", 0),
    ]),
  ["home-season-data-player-overview"],
  { revalidate: 300 },
);

export const loadHomeUpcomingGames = unstable_cache(
  () => getUpcomingGames(6),
  ["home-upcoming-games"],
  { revalidate: 300 },
);
