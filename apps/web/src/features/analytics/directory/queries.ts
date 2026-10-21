import "server-only";
import { listAdvancedGoalieLeaders, listAdvancedSkaterLeaders, listAdvancedTeamLeaders } from "@/data/performance-cache";
import type { LeaderboardType, Situation, LeaderboardRows } from "./logic";
export async function loadLeaderboard(
  type: LeaderboardType,
  seasonId: number,
  situation: Situation,
  minimumIceTimeSeconds: number,
  gameType: number,
  filters: { query?: string; position?: string } = {},
): Promise<LeaderboardRows> {
  if (type === "teams") {
    return listAdvancedTeamLeaders(seasonId, situation, gameType);
  }
  if (type === "goalies") {
    return listAdvancedGoalieLeaders(
      seasonId,
      situation,
      minimumIceTimeSeconds,
      200,
      filters,
    );
  }
  return listAdvancedSkaterLeaders(
    seasonId,
    situation,
    minimumIceTimeSeconds,
    200,
    filters,
  );
}
